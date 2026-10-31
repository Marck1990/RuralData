import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPersistencia } from '../js/persistencia-mvp.js';
import { crearSincronizador } from '../js/sincronizador-mvp.js';
import { crearSesionHandler } from '../server/sesion-handler.js';
import { crearRegistrosHandler } from '../server/registros-handler.js';
import { configuracion,crearSesion,cookieSesion } from '../server/auth.js';
import { envSintetico as env,productorSintetico,baseSintetica,llamar,memoria,passwordSintetica } from './helpers.mjs';

test('offline, recarga, dos ediciones, sesión vencida y reautenticación sincronizan sin cambiar IDs',async t=>{
  const {db,dbFactory}=baseSintetica(t),config={...configuracion(env),...productorSintetico};
  const storage=memoria();let numero=0;
  const abrir=()=>crearPersistencia({storage,establecimientoId:'campo-test',crearId:()=> 'op-'+(++numero)});
  let local=abrir();
  local.cambiar('animales',{id:'animal-offline',caravanaVisual:'OFF-001',observaciones:'alta'});
  local=abrir();assert.equal(local.listar('animales')[0].id,'animal-offline');
  local.cambiar('animales',{id:'animal-offline',caravanaVisual:'OFF-001',observaciones:'primera edición'});
  local.cambiar('animales',{id:'animal-offline',caravanaVisual:'OFF-001',observaciones:'segunda edición'});
  local.cambiar('pesajes',{id:'peso-offline',animalId:'animal-offline',fecha:'2026-01-02',pesoKg:355});
  assert.equal(abrir().estado().pendientes.length,4);
  const handlers={sesion:crearSesionHandler({env,dbFactory}),animales:crearRegistrosHandler('animales',{env,dbFactory}),pesajes:crearRegistrosHandler('pesajes',{env,dbFactory})};
  let cookie=cookieSesion(crearSesion(config,Date.now()-13*3600000)).split(';')[0];
  let conectado=false,perderAck=false;const estados=[];
  const fetcher=async(url,opciones={})=>{
    if(!conectado)throw new TypeError('Sin red sintética');
    const entidad=url.split('/').at(-1);
    const response=await llamar(handlers[entidad],{method:opciones.method||'GET',
      headers:{cookie,origin:config.origin,'content-type':'application/json'},body:opciones.body?JSON.parse(opciones.body):undefined});
    if(perderAck && opciones.method==='POST'){perderAck=false;throw new TypeError('ACK perdido');}
    return {ok:response.statusCode<300,status:response.statusCode,json:async()=>response.body};
  };
  const sync=crearSincronizador({persistencia:local,identidad:productorSintetico,fetcher,notificar:e=>estados.push(e)});
  await sync.sincronizar();assert.equal(estados.at(-1),'offline');assert.equal(local.estado().pendientes.length,4);
  conectado=true;await sync.sincronizar();assert.equal(estados.at(-1),'sesion');assert.equal(local.estado().pendientes.length,4);
  const login=await llamar(handlers.sesion,{method:'POST',headers:{origin:config.origin,'content-type':'application/json'},body:{email:config.email,password:passwordSintetica}});
  assert.equal(login.statusCode,200);cookie=login.headers['set-cookie'].split(';')[0];
  perderAck=true;await sync.sincronizar();
  assert.equal(local.estado().pendientes.length,4);assert.equal(db.prepare('SELECT version FROM animales').get().version,1);
  await sync.sincronizar();
  assert.equal(local.estado().pendientes.length,0);assert.equal(estados.at(-1),'listo');
  const animal=db.prepare('SELECT * FROM animales').get();
  assert.equal(animal.id,'animal-offline');assert.equal(animal.version,3);assert.equal(animal.observaciones,'segunda edición');
  assert.equal(db.prepare('SELECT animal_id FROM pesajes').get().animal_id,animal.id);
  assert.equal(local.listar('animales')[0].observaciones,'segunda edición');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('ACK anterior no pisa ediciones hechas durante la solicitud y descarga antigua se ignora',()=>{
  const p=crearPersistencia({storage:memoria(),establecimientoId:'campo-test'});
  p.recibir('animales',{id:'a',version:1,observaciones:'base'});
  const primera=p.cambiar('animales',{id:'a',version:1,observaciones:'primera'});
  p.cambiar('animales',{id:'a',version:1,observaciones:'segunda'});
  p.confirmar(primera.id,{id:'a',version:2,observaciones:'primera'});
  assert.equal(p.listar('animales')[0].observaciones,'segunda');
  assert.equal(p.estado().pendientes[0].versionBase,2);
  p.recibir('animales',{id:'a',version:1,observaciones:'vieja'});
  assert.equal(p.listar('animales')[0].observaciones,'segunda');
  assert.equal(Object.keys(p.estado().conflictos).length,0);
});

test('conflicto preserva ambas versiones y decisión local mantiene todas las operaciones',()=>{
  const p=crearPersistencia({storage:memoria(),establecimientoId:'campo-test'});
  p.recibir('animales',{id:'a',version:1});
  p.cambiar('animales',{id:'a',observaciones:'primera'});
  p.cambiar('animales',{id:'a',observaciones:'segunda'});
  p.recibir('animales',{id:'a',version:4,observaciones:'otro equipo'});
  const clave=Object.keys(p.estado().conflictos)[0];
  assert.equal(p.listar('animales')[0].observaciones,'segunda');
  p.resolver(clave,true);
  assert.equal(p.estado().pendientes.length,2);assert.equal(p.estado().pendientes[0].versionBase,4);
  assert.equal(p.estado().pendientes[1].dependeDe,p.estado().pendientes[0].id);
});
