import test from 'node:test';
import assert from 'node:assert/strict';
import {crearPersistencia} from '../js/persistencia-mvp.js';
import {crearSincronizador} from '../js/sincronizador-mvp.js';
import {configuracion, crearSesion, cookieSesion} from '../server/auth.js';
import {crearRegistrosHandler} from '../server/registros-handler.js';
import {crearSesionHandler} from '../server/sesion-handler.js';
import {baseSintetica, envSintetico as env, llamar, memoria, productorSintetico} from './helpers.mjs';

test('Sanidad entre dispositivos conserva IDs, recibos, conflictos y bajas sin cruzar productores', async t => {
  const {db, dbFactory}=baseSintetica(t);
  const otro={...productorSintetico,id:'otro-productor',establecimientoId:'otro-campo'};
  db.prepare("INSERT INTO usuarios VALUES (?,'Otro','otro@test.local',?,'productor','otro-campo',1,'2026-01-01',NULL)")
    .run(otro.id,otro.hash);
  const handlers={sesion:crearSesionHandler({env,dbFactory})};
  for(const entidad of ['animales','pesajes','sanidad']) handlers[entidad]=crearRegistrosHandler(entidad,{env,dbFactory});
  const config=configuracion(env);
  let ahora=1000;
  function dispositivo(nombre,identidad=productorSintetico) {
    let secuencia=0;
    const storage=memoria();
    const abrir=()=>crearPersistencia({storage,establecimientoId:identidad.establecimientoId,crearId:()=>nombre+'-'+(++secuencia)});
    const p=abrir();
    const cookie=cookieSesion(crearSesion({...config,...identidad})).split(';')[0];
    const estado={conectado:true,perderAck:false};
    const fetcher=async (url,opts={})=>{
      if(!estado.conectado)throw Error('Sin conexión');
      const entidad=url.split('/').at(-1);
      const res=await llamar(handlers[entidad],{
        method:opts.method || 'GET',headers:{...opts.headers,cookie,origin:config.origin},
        body:opts.body ? JSON.parse(opts.body) : undefined
      });
      if(entidad==='sanidad' && opts.method==='POST' && estado.perderAck) {
        estado.perderAck=false;
        throw Error('Se perdió la confirmación');
      }
      return {ok:res.statusCode<300,status:res.statusCode,json:async()=>res.body};
    };
    const sync=crearSincronizador({persistencia:p,identidad,fetcher,ahora:()=>ahora});
    return {p,sync,estado,abrir,fetcher};
  }

  const a=dispositivo('a'), b=dispositivo('b'), c=dispositivo('c',otro);
  const tratamiento={id:'tratamiento-1',animalId:'animal-1',tieneCarencia:true,diasCarencia:10,
    fechaAplicacion:'2026-11-18',fechaLiberacion:'2026-11-28',dosis:'3 ml',veterinarioFirmante:'QA'};
  a.estado.conectado=false;
  a.p.cambiar('animales',{id:tratamiento.animalId,caravanaVisual:'91000001'});
  const alta=a.p.cambiar('sanidad',tratamiento);
  await a.sync.sincronizar();
  assert.equal(a.abrir().listar('sanidad')[0].id,tratamiento.id);
  assert.equal(a.p.estado().pendientes.length,2);
  assert.equal(a.sync.sanidadVerificada(),false);

  await b.sync.sincronizar();
  assert.equal(b.sync.sanidadVerificada(),true);
  ahora+=60000;
  assert.equal(b.sync.sanidadVerificada(),false);
  b.estado.conectado=false;
  await b.sync.sincronizar();
  assert.equal(b.sync.sanidadVerificada(),false);

  a.estado.conectado=true;
  a.estado.perderAck=true;
  await a.sync.sincronizar();
  assert.equal(a.p.estado().pendientes[0].id,alta.id);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM sanidad').get().total,1);
  a.p.cambiar('sanidad',{...tratamiento,observaciones:'Edición local pendiente'});
  b.estado.conectado=true;
  await b.sync.sincronizar();
  const recibido=b.p.listar('sanidad')[0];
  assert.equal(recibido.version,1);
  assert.equal(recibido.animalId,tratamiento.animalId);
  assert.equal(recibido.dosis,'3 ml');
  b.p.cambiar('sanidad',{...recibido,observaciones:'Edición en segundo dispositivo'});
  assert.equal(b.sync.sanidadVerificada(),false);
  await b.sync.sincronizar();

  await a.sync.sincronizar();
  assert.equal(a.p.estado().pendientes.length,1);
  const conflicto=a.p.estado().conflictos[alta.clave];
  assert.equal(conflicto.version,2);
  assert.equal(conflicto.observaciones,'Edición en segundo dispositivo');
  assert.equal(a.p.listar('sanidad')[0].observaciones,'Edición local pendiente');
  assert.equal(a.sync.sanidadVerificada(),false);
  const repetida=await a.fetcher('/api/sanidad',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({operacionId:alta.id,versionBase:null,registro:{...tratamiento,dosis:'Otra dosis'}})});
  assert.equal(repetida.status,409);

  await c.sync.sincronizar();
  assert.deepEqual(c.p.listar('sanidad'),[]);
  c.p.cambiar('sanidad',{...tratamiento,id:'tratamiento-ajeno'});
  await c.sync.sincronizar();
  assert.equal(c.p.estado().pendientes.length,1);
  assert.equal(c.sync.sanidadVerificada(),false);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM sanidad').get().total,1);

  a.p.resolver(alta.clave,false);
  await a.sync.sincronizar();
  assert.equal(a.sync.sanidadVerificada(),true);
  a.p.guardarColeccion('sanidad',[]);
  assert.equal(a.sync.sanidadVerificada(),false);
  await a.sync.sincronizar();
  await b.sync.sincronizar();
  assert.deepEqual(b.p.listar('sanidad'),[]);
  const historico=db.prepare('SELECT id,animal_id,version,eliminado_en FROM sanidad').get();
  assert.equal(historico.id,tratamiento.id);
  assert.equal(historico.animal_id,tratamiento.animalId);
  assert.equal(historico.version,3);
  assert.ok(historico.eliminado_en);
  assert.equal(db.prepare('SELECT COUNT(*) AS total FROM sanidad_operaciones').get().total,3);
});
