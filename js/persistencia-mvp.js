// Núcleo local: un único sobre conserva registros, operaciones y conflictos.
export function crearPersistencia({storage,establecimientoId,crearId=()=>crypto.randomUUID()}) {
  if (!establecimientoId) throw new Error('Falta establecimiento estable');
  const clave='ruraldata_mvp_v1_'+establecimientoId;
  const llave=(entidad,id)=>JSON.stringify([entidad,id]);
  const leer=()=>{
    const texto=storage.getItem(clave);
    return texto ? JSON.parse(texto) : {registros:{},pendientes:[],conflictos:{}};
  };
  const guardar=e=>storage.setItem(clave,JSON.stringify(e));
  function encolar(e,entidad,registro) {
    if (!registro.id) throw new Error('Debe conservarse el ID del registro');
    const k=llave(entidad,registro.id);
    const anteriores=e.pendientes.filter(p=>p.clave===k);
    const anterior=e.registros[k];
    const op={id:crearId(),clave:k,entidad,registroId:registro.id,
      versionBase:anteriores.length ? null : (anterior?.version ?? null),
      dependeDe:anteriores.at(-1)?.id ?? null,registro:{...registro}};
    e.registros[k]={...registro}; e.pendientes.push(op); return op;
  }
  return {
    estado:leer,
    listar(entidad) {
      return Object.entries(leer().registros).filter(([k,r])=>JSON.parse(k)[0]===entidad && !r.eliminado_en).map(([,r])=>r);
    },
    cambiar(entidad,registro) {const e=leer(); const op=encolar(e,entidad,registro); guardar(e);return op;},
    guardarColeccion(entidad,registros) {
      const e=leer();const ids=new Set();
      for(const r of registros) {
        if(!r.id || ids.has(r.id)) throw new Error('ID ausente o duplicado'); ids.add(r.id);
        const anterior=e.registros[llave(entidad,r.id)];
        if(JSON.stringify(anterior)!==JSON.stringify(r)) encolar(e,entidad,r);
      }
      for(const [k,r] of Object.entries(e.registros)) {
        if(JSON.parse(k)[0]===entidad && !r.eliminado_en && !ids.has(r.id)) {
          encolar(e,entidad,{...r,eliminado_en:new Date().toISOString()});
        }
      }
      guardar(e);
    },
    adoptar(entidad,registros) {
      const e=leer();
      for(const r of registros) if(!e.registros[llave(entidad,r.id)]) {
        // Los datos antiguos no tienen una versión remota comprobada.
        const copia={...r};delete copia.version;encolar(e,entidad,copia);
      }
      guardar(e);
    },
    recibir(entidad,remoto) {
      if(!remoto.id || !Number.isInteger(remoto.version) || remoto.version<1) throw new Error('Registro remoto inválido');
      const e=leer(),k=llave(entidad,remoto.id);
      const pendiente=e.pendientes.find(p=>p.clave===k);
      if(pendiente) {
        if(remoto.version>(pendiente.versionBase ?? 0) && remoto.version>(e.conflictos[k]?.version ?? 0)) e.conflictos[k]={...remoto};
      } else if(!e.registros[k] || remoto.version>e.registros[k].version) e.registros[k]={...e.registros[k],...remoto};
      guardar(e);
    },
    conflicto(opId,remoto,mensaje) {
      const e=leer(),op=e.pendientes.find(p=>p.id===opId);if(!op)return;
      e.conflictos[op.clave]=remoto ? {...remoto,mensaje} : {id:op.registroId,mensaje,sinVersion:true};guardar(e);
    },
    resolver(k,usarLocal) {
      const e=leer(),remoto=e.conflictos[k];
      if(!remoto || remoto.sinVersion) throw new Error('Este conflicto requiere revisar identificación o dependencia');
      const ops=e.pendientes.filter(p=>p.clave===k);
      if(!ops.length)return;
      if(usarLocal) {
        const viejo=ops[0].id;ops[0].id=crearId();ops[0].versionBase=remoto.version;
        for(const op of ops)if(op.dependeDe===viejo)op.dependeDe=ops[0].id;
      } else {
        e.historialResuelto ??=[];
        e.historialResuelto.push({fecha:new Date().toISOString(),operaciones:ops});
        e.pendientes=e.pendientes.filter(p=>p.clave!==k);
        e.registros[k]={...e.registros[k],...remoto};
      }
      delete e.conflictos[k];guardar(e);
    },
    confirmar(opId,remoto) {
      const e=leer(),op=e.pendientes.find(p=>p.id===opId);if(!op)return;
      if(op.dependeDe)throw new Error('Confirmación fuera de orden');
      if(remoto.id!==op.registroId)throw new Error('El servidor intentó cambiar el ID');
      if(!Number.isInteger(remoto.version) || remoto.version<=(op.versionBase ?? 0))throw new Error('Confirmación sin versión nueva');
      e.pendientes=e.pendientes.filter(p=>p.id!==opId);
      const siguientes=e.pendientes.filter(p=>p.clave===op.clave);
      for(const siguiente of siguientes)if(siguiente.dependeDe===opId){siguiente.dependeDe=null;siguiente.versionBase=remoto.version;}
      // Un ACK del primer cambio nunca pisa la segunda edición local.
      e.registros[op.clave]=siguientes.length ? {...e.registros[op.clave],version:remoto.version} : {...e.registros[op.clave],...remoto};
      if(!siguientes.length && e.conflictos[op.clave]?.version>remoto.version) {
        e.registros[op.clave]={...e.registros[op.clave],...e.conflictos[op.clave]};
        delete e.conflictos[op.clave];
      }
      if((e.conflictos[op.clave]?.version ?? 0)<=remoto.version)delete e.conflictos[op.clave];
      guardar(e);
    }
  };
}
