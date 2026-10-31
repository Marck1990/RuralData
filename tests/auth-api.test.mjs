import test from 'node:test';
import assert from 'node:assert/strict';
import { configuracion,crearSesion,cookieSesion,autorizar,leerSesion,hashPassword,verificarPassword } from '../server/auth.js';
import { crearSesionHandler } from '../server/sesion-handler.js';
import { crearRegistrosHandler } from '../server/registros-handler.js';
import { crearDiagnosticoHandler } from '../server/diagnostico-handler.js';
import { abrirDb } from '../server/db.js';
import { envSintetico as env,passwordSintetica,productorSintetico,baseSintetica,llamar } from './helpers.mjs';
const config={...configuracion(env),...productorSintetico};
const headers=()=>({cookie:cookieSesion(crearSesion(config)).split(';')[0],origin:config.origin,'content-type':'application/json'});

test('hash con sal, cookies seguras, firma y expiración comprobadas en servidor',async()=>{
  const hash=await hashPassword(passwordSintetica);
  assert.notEqual(hash,config.hash);assert.ok(await verificarPassword(passwordSintetica,hash));
  assert.equal(await verificarPassword('incorrecta',hash),false);
  const ahora=Date.now(), token=crearSesion(config,ahora);
  const cookie=cookieSesion(token);
  for(const atributo of ['HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(cookie.includes(atributo));
  const req={method:'GET',headers:{cookie:cookie.split(';')[0]},query:{}};
  assert.equal(leerSesion(req,config,ahora).sub,'productor-test');
  assert.throws(()=>leerSesion(req,config,ahora+13*3600000),e=>e.status===401);
  assert.throws(()=>leerSesion({...req,headers:{cookie:req.headers.cookie+'x'}},config),e=>e.status===401);
  assert.throws(()=>abrirDb({}),/deshabilitada/);
});

test('todas las API rechazan falta de sesión antes de abrir una base',async()=>{
  const dbFactory=()=>assert.fail('No debe abrirse la base');
  for(const handler of [crearRegistrosHandler('animales',{env,dbFactory}),crearRegistrosHandler('pesajes',{env,dbFactory}),crearDiagnosticoHandler({env,dbFactory}),crearSesionHandler({env,dbFactory})]) {
    const res=await llamar(handler);assert.equal(res.statusCode,401);assert.equal(res.headers['cache-control'],'no-store');
  }
});

test('login, logout y límite durable sobreviven a recrear el handler',async t=>{
  const {dbFactory}=baseSintetica(t);
  const handler=crearSesionHandler({env,dbFactory});
  const login=await llamar(handler,{method:'POST',headers:headers(),body:{email:config.email,password:passwordSintetica}});
  assert.equal(login.statusCode,200);assert.ok(login.headers['set-cookie'].includes('HttpOnly'));
  assert.equal(JSON.stringify(login.body).includes(passwordSintetica),false);
  assert.equal('rol' in login.body.perfil,false);
  const logout=await llamar(handler,{method:'DELETE',headers:headers()});assert.equal(logout.statusCode,200);
  assert.ok(logout.headers['set-cookie'].includes('Max-Age=0'));
  for(let i=0;i<9;i++)assert.equal((await llamar(crearSesionHandler({env,dbFactory}),{method:'POST',headers:headers(),body:{email:config.email,password:'incorrecta'}})).statusCode,401);
  assert.equal((await llamar(crearSesionHandler({env,dbFactory}),{method:'POST',headers:headers(),body:{email:config.email,password:passwordSintetica}})).statusCode,429);
});

test('origen inválido y establecimiento arbitrario se rechazan sin exponer datos',async t=>{
  const {dbFactory}=baseSintetica(t);const handler=crearRegistrosHandler('animales',{env,dbFactory});
  assert.equal((await llamar(handler,{headers:headers(),query:{establecimiento_id:'otro-campo'}})).statusCode,403);
  assert.equal((await llamar(handler,{method:'POST',headers:headers(),body:{establecimiento_id:'otro-campo'}})).statusCode,403);
  assert.equal((await llamar(handler,{method:'POST',headers:{...headers(),origin:'https://ajeno.test'}})).statusCode,403);
  const login=crearSesionHandler({env,dbFactory});
  assert.equal((await llamar(login,{method:'POST',headers:{origin:'https://ajeno.test'}})).statusCode,403);
});

test('animales y pesajes conservan IDs, reintentos, versiones, bajas y pertenencia',async t=>{
  const {db,dbFactory}=baseSintetica(t);
  const animales=crearRegistrosHandler('animales',{env,dbFactory}),pesajes=crearRegistrosHandler('pesajes',{env,dbFactory});
  const animal={id:'animal-test',caravanaVisual:'TEST-001'};
  const body={operacionId:'op-alta',versionBase:null,registro:animal};
  const alta=await llamar(animales,{method:'POST',headers:headers(),body});assert.equal(alta.statusCode,201);
  assert.equal(alta.body.registro.id,animal.id);
  const repetir=await llamar(animales,{method:'POST',headers:headers(),body});assert.equal(repetir.statusCode,200);assert.equal(repetir.body.registro.version,1);
  const editado=await llamar(animales,{method:'POST',headers:headers(),body:{operacionId:'op-edit',versionBase:1,registro:{...animal,observaciones:'nuevo'}}});assert.equal(editado.body.registro.version,2);
  const antiguo=await llamar(animales,{method:'POST',headers:headers(),body:{operacionId:'op-vieja',versionBase:1,registro:animal}});assert.equal(antiguo.statusCode,409);assert.equal(antiguo.body.registro.version,2);
  const duplicado=await llamar(animales,{method:'POST',headers:headers(),body:{operacionId:'op-dup',versionBase:null,registro:{...animal,id:'otro-id'}}});assert.equal(duplicado.statusCode,409);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM animales').get().n,1);
  db.exec("INSERT INTO animales(id,establecimiento_id,caravana_visual,fecha_registro) VALUES ('ajeno','otro-campo','AJENO','2026-01-01')");
  const peso={id:'peso-test',animalId:'animal-test',fecha:'2026-01-02',pesoKg:350};
  const guardar=registro=>llamar(pesajes,{method:'POST',headers:headers(),body:{operacionId:'op-peso',versionBase:null,registro}});
  assert.equal((await guardar({...peso,animalId:'ajeno'})).statusCode,409);
  const guardado=await guardar(peso);assert.equal(guardado.statusCode,201);assert.equal(guardado.body.registro.animalId,animal.id);
  const baja=await llamar(pesajes,{method:'DELETE',headers:headers(),body:{operacionId:'op-baja',versionBase:1,registro:{...peso,eliminado_en:'2026-01-04T00:00:00Z'}}});assert.equal(baja.statusCode,200);
  assert.equal(db.prepare('SELECT animal_id FROM pesajes').get().animal_id,animal.id);
  const lista=await llamar(animales,{headers:headers()});assert.equal(lista.body.animales.length,1);
  assert.equal((await llamar(animales,{method:'POST',headers:headers(),body:{operacionId:'op-ajena',versionBase:1,registro:{id:'ajeno',caravanaVisual:'AJENO'}}})).statusCode,403);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});
