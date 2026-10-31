import { modelos, desdeSql } from '../js/modelos-mvp.js';
import { abrirDb } from './db.js';
import { configuracion, autorizar, sinCache, responderError, HttpError } from './auth.js';
import { listarDelEstablecimiento } from './datos-establecimiento.js';

const texto = v => typeof v==='string' ? v.trim() : '';
const idValido = v => typeof v==='string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);
const fechaValida = v => typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v;

export function crearRegistrosHandler(entidad,{env=process.env,dbFactory=()=>abrirDb(env)} = {}) {
  if (!modelos[entidad]) throw new Error('Entidad no soportada');
  return async (req,res) => {
    sinCache(res); let db,tx;
    try {
      const config = configuracion(env);
      const sesion = await autorizar(req,config,dbFactory);db=sesion.db;
      const establecimiento = sesion.establecimientoId;
      if (!['GET','POST','PUT','DELETE'].includes(req.method)) throw new HttpError(405,'Método no permitido');
      if (req.method==='DELETE' && entidad!=='pesajes') throw new HttpError(405,'Método no permitido');
      if (req.method==='GET') {
        const result = await listarDelEstablecimiento(sesion,entidad);
        if(result.rows.some(r=>!idValido(r.id))) throw new HttpError(409,'Hay identificadores que requieren revisión; no se modificaron');
        return res.status(200).json({ok:true,[entidad]:result.rows.map(r=>desdeSql(entidad,r))});
      }
      if (!req.headers?.['content-type']?.startsWith('application/json')) throw new HttpError(415,'Se requiere JSON');
      const {operacionId,versionBase,registro} = req.body || {};
      if (!idValido(operacionId) || !registro || !idValido(registro.id) ||
          !(versionBase===null || (Number.isInteger(versionBase) && versionBase>0))) throw new HttpError(400,'Operación inválida');
      if (registro.establecimiento_id!==undefined || registro.establecimientoId!==undefined) throw new HttpError(403,'El establecimiento lo determina el servidor');
      const valores = {};
      for (const [local,columna] of Object.entries(modelos[entidad])) {
        if (local==='pesoKg') valores[columna] = Number(registro[local]);
        else {
          if (registro[local]!=null && typeof registro[local]!=='string') throw new HttpError(400,'Campo de texto inválido');
          if ((registro[local]?.length ?? 0)>10000) throw new HttpError(400,'Campo demasiado extenso');
          valores[columna] = texto(registro[local]);
        }
      }
      if (entidad==='animales' && !valores.caravana_visual && !valores.codigo_rfid) throw new HttpError(400,'Ingresá caravana o RFID');
      if (entidad==='animales' && valores.fecha_nacimiento && !fechaValida(valores.fecha_nacimiento)) throw new HttpError(400,'Nacimiento inválido');
      if (entidad==='pesajes' && (!idValido(valores.animal_id) || !fechaValida(valores.fecha) ||
          !Number.isFinite(valores.peso_kg) || valores.peso_kg<=0)) throw new HttpError(400,'Pesaje inválido');
      const eliminado = registro.eliminado_en ?? null;
      if (eliminado!==null && (typeof eliminado!=='string' || !Number.isFinite(Date.parse(eliminado)))) throw new HttpError(400,'Fecha de baja inválida');
      if (req.method==='DELETE' && !eliminado) throw new HttpError(400,'Falta baja lógica');
      tx = await db.transaction('write');
      const actual = (await tx.execute({sql:`SELECT * FROM ${entidad} WHERE id=?`,args:[registro.id]})).rows[0];
      if (actual && actual.establecimiento_id!==establecimiento) throw new HttpError(403,'Registro no autorizado');
      const iguales = actual && Object.entries(valores).every(([k,v]) => (actual[k] ?? '')===v) && (actual.eliminado_en ?? null)===eliminado;
      if (actual && ((actual.ultima_operacion_id===operacionId && iguales) || (versionBase===null && iguales))) {
        await tx.commit(); return res.status(200).json({ok:true,registro:desdeSql(entidad,actual)});
      }
      if (actual?.ultima_operacion_id===operacionId) throw new HttpError(409,'Operación repetida con contenido diferente');
      if ((actual && Number(actual.version)!==versionBase) || (!actual && versionBase!==null)) {
        await tx.rollback();
        return res.status(409).json({ok:false,error:'El registro cambió; revisá el conflicto',registro:actual ? desdeSql(entidad,actual) : null});
      }
      if (entidad==='pesajes') {
        const animal = (await tx.execute({sql:'SELECT id FROM animales WHERE id=? AND establecimiento_id=? AND eliminado_en IS NULL',args:[valores.animal_id,establecimiento]})).rows[0];
        if (!animal) throw new HttpError(409,'El animal debe sincronizarse primero');
      } else if (!eliminado) {
        const duplicado = (await tx.execute({sql:`SELECT id FROM animales WHERE establecimiento_id=? AND id<>? AND eliminado_en IS NULL
          AND ((?<>'' AND LOWER(TRIM(caravana_visual))=LOWER(TRIM(?))) OR (?<>'' AND LOWER(TRIM(codigo_rfid))=LOWER(TRIM(?)))) LIMIT 1`,
          args:[establecimiento,registro.id,valores.caravana_visual,valores.caravana_visual,valores.codigo_rfid,valores.codigo_rfid]})).rows[0];
        if (duplicado) throw new HttpError(409,'Caravana o RFID repetidos; se conservan los IDs para revisión');
      }
      const ahora = new Date().toISOString(); const columnas = Object.keys(valores);
      if (actual) {
        const resultado = await tx.execute({sql:`UPDATE ${entidad} SET ${columnas.map(c=>c+'=?').join(',')},
          eliminado_en=?,ultima_operacion_id=?,fecha_actualizacion=?,version=version+1 WHERE id=? AND establecimiento_id=? AND version=?`,
          args:[...Object.values(valores),eliminado,operacionId,ahora,registro.id,establecimiento,versionBase]});
        if (resultado.rowsAffected!==1) throw new HttpError(409,'Conflicto de versión');
      } else {
        const fechaRegistro = typeof registro.fechaRegistro==='string' && Number.isFinite(Date.parse(registro.fechaRegistro)) ? registro.fechaRegistro : ahora;
        await tx.execute({sql:`INSERT INTO ${entidad}(id,establecimiento_id,${columnas.join(',')},eliminado_en,ultima_operacion_id,fecha_registro,fecha_actualizacion,version)
          VALUES (${Array(columnas.length+6).fill('?').join(',')},1)`,
          args:[registro.id,establecimiento,...Object.values(valores),eliminado,operacionId,fechaRegistro,ahora]});
      }
      const guardado = (await tx.execute({sql:`SELECT * FROM ${entidad} WHERE id=? AND establecimiento_id=?`,args:[registro.id,establecimiento]})).rows[0];
      await tx.commit(); return res.status(actual ? 200 : 201).json({ok:true,registro:desdeSql(entidad,guardado)});
    } catch(error) {
      if (tx) { try { await tx.rollback(); } catch {} }
      return responderError(res,error);
    } finally { tx?.close(); db?.close(); }
  };
}
