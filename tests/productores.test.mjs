import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { crearRegistroHandler } from '../server/registro-handler.js';
import { crearSesionHandler } from '../server/sesion-handler.js';
import { crearRegistrosHandler } from '../server/registros-handler.js';
import { configuracion,autorizar,crearSesion,cookieSesion } from '../server/auth.js';
import { listarDelEstablecimiento } from '../server/datos-establecimiento.js';
import { crearPersistencia } from '../js/persistencia-mvp.js';
import { crearSincronizador } from '../js/sincronizador-mvp.js';
import { espacioProductor } from '../js/identidad-mvp.js';
import { envSintetico as env,baseSintetica,llamar,memoria,passwordSintetica } from './helpers.mjs';
const origin=env.RURALDATA_ALLOWED_ORIGIN;
const jsonHeaders={'content-type':'application/json',origin};

async function dosProductores(t) {
  const base=baseSintetica(t);
  const registro=crearRegistroHandler({env,dbFactory:base.dbFactory});
  const login=crearSesionHandler({env,dbFactory:base.dbFactory});
  const productores=[];
  for(const nombre of ['Ana','Bruno']) {
    const email=nombre.toLowerCase()+'@prueba.local';
    const alta=await llamar(registro,{method:'POST',headers:jsonHeaders,body:{nombre,email,password:passwordSintetica,nombreEstablecimiento:'Campo '+nombre}});
    assert.equal(alta.statusCode,201);assert.equal(alta.headers['set-cookie'],undefined);
    const acceso=await llamar(login,{method:'POST',headers:jsonHeaders,body:{email,password:passwordSintetica}});
    assert.equal(acceso.statusCode,200);
    productores.push({perfil:acceso.body.perfil,cookie:acceso.headers['set-cookie'].split(';')[0]});
  }
  return {...base,registro,login,productores};
}
const headers=p=>({...jsonHeaders,cookie:p.cookie,'x-ruraldata-usuario':p.perfil.id,'x-ruraldata-establecimiento':p.perfil.establecimientoId});

test('registro público crea dos cuentas y establecimientos distintos sin modificar usuarios anteriores',async t=>{
  const {db,registro,login,productores:[a,b]}=await dosProductores(t);
  assert.notEqual(a.perfil.id,b.perfil.id);assert.notEqual(a.perfil.establecimientoId,b.perfil.establecimientoId);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n,3);
  assert.equal(db.prepare("SELECT rol FROM usuarios WHERE id='productor-test'").get().rol,'valor-historico');
  for(const p of [a,b]) {
    assert.equal('rol' in p.perfil,false);assert.equal('password_hash' in p.perfil,false);
    const u=db.prepare('SELECT * FROM usuarios WHERE id=?').get(p.perfil.id);
    assert.notEqual(u.password_hash,passwordSintetica);assert.ok(u.password_hash.startsWith('scrypt$'));assert.equal(u.rol,'productor');
  }
  const antes=db.prepare('SELECT COUNT(*) AS n FROM establecimientos').get().n;
  const duplicado=await llamar(registro,{method:'POST',headers:jsonHeaders,body:{nombre:'Duplicado',nombreEstablecimiento:'No crear',email:' ANA@PRUEBA.LOCAL ',password:passwordSintetica}});
  assert.equal(duplicado.statusCode,409);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM establecimientos').get().n,antes);
  const invalida=await llamar(login,{method:'POST',headers:jsonHeaders,body:{email:'ana@prueba.local',password:'incorrecta'}});assert.equal(invalida.statusCode,401);
  const ajeno=await llamar(registro,{method:'POST',headers:jsonHeaders,body:{nombre:'Ajeno',nombreEstablecimiento:'No crear',email:'ajeno@prueba.local',password:passwordSintetica,establecimiento_id:a.perfil.establecimientoId}});assert.equal(ajeno.statusCode,400);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
});

test('API filtra consultas y rechaza IDs, referencias y encabezados de otro productor',async t=>{
  const {db,dbFactory,login,productores:[a,b]}=await dosProductores(t);
  const animales=crearRegistrosHandler('animales',{env,dbFactory}),pesajes=crearRegistrosHandler('pesajes',{env,dbFactory});
  for(const [p,id] of [[a,'animal-a'],[b,'animal-b']]) {
    // La misma caravana es válida en dos establecimientos independientes.
    assert.equal((await llamar(animales,{method:'POST',headers:headers(p),body:{operacionId:'alta-'+id,versionBase:null,registro:{id,caravanaVisual:'MISMA-001'}}})).statusCode,201);
    assert.equal((await llamar(animales,{headers:headers(p)})).body.animales[0].id,id);
  }
  const ataque=await llamar(animales,{method:'POST',headers:headers(b),body:{operacionId:'robar',versionBase:1,registro:{id:'animal-a',caravanaVisual:'MODIFICADA'}}});assert.equal(ataque.statusCode,403);
  const query=await llamar(animales,{headers:headers(b),query:{establecimiento_id:a.perfil.establecimientoId}});assert.equal(query.statusCode,403);
  const referencia=await llamar(pesajes,{method:'POST',headers:headers(b),body:{operacionId:'peso-ajeno',versionBase:null,registro:{id:'peso-ajeno',animalId:'animal-a',fecha:'2026-01-01',pesoKg:300}}});assert.equal(referencia.statusCode,409);
  const cruzada=await llamar(animales,{headers:{...headers(a),cookie:b.cookie}});assert.equal(cruzada.statusCode,403);
  const logoutAjeno=await llamar(login,{method:'DELETE',headers:{...headers(a),cookie:b.cookie}});assert.equal(logoutAjeno.statusCode,403);
  assert.equal(logoutAjeno.headers['set-cookie'],undefined);
  // La sesión vuelve a consultar activo y establecimiento en cada petición.
  db.prepare('UPDATE usuarios SET activo=0 WHERE id=?').run(a.perfil.id);
  assert.equal((await llamar(animales,{headers:headers(a)})).statusCode,401);
  assert.equal((await llamar(animales,{headers:headers(b)})).body.animales.length,1);
});

test('cuentas históricas ambiguas o hash incompatible fallan sin modificar datos; un cambio de hash invalida sesión',async t=>{
  const {db,dbFactory,login,productores:[a]}=await dosProductores(t);
  const original=db.prepare('SELECT * FROM usuarios WHERE id=?').get(a.perfil.id);
  db.prepare(`INSERT INTO usuarios(id,nombre,email,password_hash,rol,establecimiento_id,fecha_registro)
    VALUES ('email-ambiguo','Histórico',?,?,'rol-historico',?,'2026-01-01')`).run(original.email.toUpperCase(),original.password_hash,original.establecimiento_id);
  const ambiguo=await llamar(login,{method:'POST',headers:jsonHeaders,body:{email:original.email,password:passwordSintetica}});assert.equal(ambiguo.statusCode,401);
  assert.equal(db.prepare('SELECT password_hash FROM usuarios WHERE id=?').get(a.perfil.id).password_hash,original.password_hash);
  db.prepare('UPDATE usuarios SET password_hash=? WHERE id=?').run('formato-historico-no-admitido',a.perfil.id);
  assert.equal((await llamar(login,{headers:headers(a)})).statusCode,401);
  const invalido=await llamar(login,{method:'POST',headers:jsonHeaders,body:{email:original.email,password:passwordSintetica}});assert.equal(invalido.statusCode,401);
});

test('todas las tablas productivas se consultan con ámbito del usuario autenticado',async t=>{
  const {db,dbFactory,productores:[a,b]}=await dosProductores(t);
  for(const [p,s]of [[a,'a'],[b,'b']]) {
    const est=p.perfil.establecimientoId;
    db.prepare('INSERT INTO animales(id,establecimiento_id,caravana_visual,fecha_registro) VALUES (?,?,?,?)').run('animal-'+s,est,'TEST','2026-01-01');
    db.prepare('INSERT INTO sanidad(id,establecimiento_id,animal_id,fecha_registro) VALUES (?,?,?,?)').run('sanidad-'+s,est,'animal-'+s,'2026-01-01');
    db.prepare('INSERT INTO reproduccion(id,establecimiento_id,animal_id,fecha_registro) VALUES (?,?,?,?)').run('repro-'+s,est,'animal-'+s,'2026-01-01');
    db.prepare('INSERT INTO pesajes(id,establecimiento_id,animal_id,fecha,peso_kg,fecha_registro) VALUES (?,?,?,?,?,?)').run('peso-'+s,est,'animal-'+s,'2026-01-01',300,'2026-01-01');
    db.prepare('INSERT INTO lotes_embarque(id,establecimiento_id,nombre,fecha,fecha_registro) VALUES (?,?,?,?,?)').run('lote-'+s,est,'TEST','2026-01-01','2026-01-01');
    db.prepare('INSERT INTO animales_lotes_embarque(id,establecimiento_id,lote_id,animal_id,estado,fecha_lectura) VALUES (?,?,?,?,?,?)').run('integrante-'+s,est,'lote-'+s,'animal-'+s,'apto','2026-01-01');
    db.prepare('INSERT INTO txt_lista(id,establecimiento_id,animal_id,fecha_actualizacion) VALUES (?,?,?,?)').run('lista-'+s,est,'animal-'+s,'2026-01-01');
    db.prepare('INSERT INTO txt_archivos(id,establecimiento_id,tipo,nombre_archivo,fecha_actualizacion) VALUES (?,?,?,?,?)').run('txt-'+s,est,'generado','test.txt','2026-01-01');
  }
  for(const p of [a,b]) {
    const sesion=await autorizar({method:'GET',headers:headers(p)},configuracion(env),dbFactory);
    for(const tabla of ['animales','sanidad','reproduccion','pesajes','lotes_embarque','animales_lotes_embarque','txt_lista','txt_archivos']) {
      const filas=(await listarDelEstablecimiento(sesion,tabla)).rows;assert.equal(filas.length,1);assert.equal(filas[0].establecimiento_id,p.perfil.establecimientoId);
    }
  }
});

test('caché y módulos originales aíslan todos los datos en un mismo navegador',async t=>{
  const {productores:[a,b]}=await dosProductores(t),localStorage=memoria();
  const crearContexto=p=>{
    const sessionStorage=memoria();sessionStorage.setItem('ruraldata_sesion_productor_v2',JSON.stringify(p.perfil));
    const cache=crearPersistencia({storage:localStorage,establecimientoId:espacioProductor(p.perfil)});
    const contexto=vm.createContext({localStorage,sessionStorage,window:{RuralDataMvp:{listar:e=>cache.listar(e),guardar:(e,r)=>cache.guardarColeccion(e,r)}},document:{addEventListener(){}}});
    for(const nombre of ['storage','txt-snig','importar-txt'])vm.runInContext(readFileSync(new URL('../js/'+nombre+'.js',import.meta.url),'utf8'),contexto);
    return contexto;
  };
  const ca=crearContexto(a),cb=crearContexto(b);
  localStorage.setItem('ruraldata_animales_espacio_antiguo',JSON.stringify([{id:'legado-sin-dueño-confirmado'}]));
  assert.equal(ca.obtenerAnimales().length,0);assert.equal(cb.obtenerAnimales().length,0);
  for(const [guardar,obtener]of [['guardarAnimales','obtenerAnimales'],['guardarPesajes','obtenerPesajes'],['guardarSanidad','obtenerSanidad'],['guardarReproduccion','obtenerReproduccion'],['guardarLotesEmbarque','obtenerLotesEmbarque'],['guardarAnimalesLotesEmbarque','obtenerAnimalesLotesEmbarque'],['guardarListaTxt','obtenerListaTxt'],['guardarHistorialTxt','obtenerHistorialTxt'],['guardarArchivosProcesadosTxt','obtenerArchivosProcesadosTxt']]) {
    ca[guardar]([{id:'dato-a'}]);cb[guardar]([{id:'dato-b'}]);
    assert.equal(ca[obtener]()[0].id,'dato-a');assert.equal(cb[obtener]()[0].id,'dato-b');
    assert.equal(crearContexto(a)[obtener]()[0].id,'dato-a');
  }
  ca.cerrarSesionLocal();assert.equal(cb.obtenerSesion().id,b.perfil.id);assert.throws(()=>ca.obtenerSanidad(),/sesión/);
  assert.ok(localStorage.getItem('ruraldata_animales_espacio_antiguo').includes('legado-sin-dueño-confirmado'));
});

test('cookie de otro productor nunca envía pendientes ni descarga datos; vuelve a sincronizar al reautenticar',async t=>{
  const {db,dbFactory,login,productores:[a,b]}=await dosProductores(t);
  const localStorage=memoria();
  const pa=crearPersistencia({storage:localStorage,establecimientoId:espacioProductor(a.perfil)});
  const pb=crearPersistencia({storage:localStorage,establecimientoId:espacioProductor(b.perfil)});
  pa.cambiar('animales',{id:'offline-a',caravanaVisual:'OFF-A'});pb.cambiar('animales',{id:'offline-b',caravanaVisual:'OFF-B'});
  const handlers={sesion:login,animales:crearRegistrosHandler('animales',{env,dbFactory}),pesajes:crearRegistrosHandler('pesajes',{env,dbFactory})};
  let cookie=b.cookie;let post=0;const estados=[];
  const fetcher=async(url,op={})=>{
    if(op.method==='POST')post++;
    const r=await llamar(handlers[url.split('/').at(-1)],{method:op.method||'GET',headers:{...op.headers,origin,cookie},body:op.body?JSON.parse(op.body):undefined});
    return {ok:r.statusCode<300,status:r.statusCode,json:async()=>r.body};
  };
  const sync=crearSincronizador({persistencia:pa,identidad:a.perfil,fetcher,notificar:e=>estados.push(e)});
  await sync.sincronizar();assert.equal(post,0);assert.equal(pa.estado().pendientes.length,1);assert.equal(estados.at(-1),'sesion');
  const reingreso=await llamar(login,{method:'POST',headers:jsonHeaders,body:{email:a.perfil.email,password:passwordSintetica}});
  cookie=reingreso.headers['set-cookie'].split(';')[0];await sync.sincronizar();
  assert.equal(pa.estado().pendientes.length,0);assert.equal(pb.estado().pendientes.length,1);
  assert.equal(db.prepare('SELECT establecimiento_id FROM animales WHERE id=?').get('offline-a').establecimiento_id,a.perfil.establecimientoId);
  // Cambio de cookie entre GET sesión y POST: la cabecera de identidad lo bloquea.
  pa.cambiar('animales',{...pa.listar('animales')[0],observaciones:'otra edición'});
  const carrera=crearSincronizador({persistencia:pa,identidad:a.perfil,fetcher:async(url,op)=>{
    const r=await fetcher(url,op);if(url==='/api/sesion')cookie=b.cookie;return r;
  }});
  cookie=reingreso.headers['set-cookie'].split(';')[0];await carrera.sincronizar();
  assert.equal(pa.estado().pendientes.length,1);assert.notEqual(db.prepare('SELECT observaciones FROM animales WHERE id=?').get('offline-a').observaciones,'otra edición');
});

test('reabrir offline conserva la última cuenta, no sustituye otra pestaña y logout no ofrece cuentas ajenas',()=>{
  const localStorage=memoria();
  const abrir=()=>{
    const contexto=vm.createContext({localStorage,sessionStorage:memoria()});
    vm.runInContext(readFileSync(new URL('../js/storage.js',import.meta.url),'utf8'),contexto);return contexto;
  };
  const a={id:'a',establecimientoId:'campo-a',autenticacionMvp:true};
  const b={id:'b',establecimientoId:'campo-b',autenticacionMvp:true};
  const tabA=abrir();tabA.guardarSesion(a);
  assert.equal(abrir().obtenerSesion().id,'a');
  const tabB=abrir();tabB.guardarSesion(b);
  assert.equal(tabA.obtenerSesion().id,'a');assert.equal(abrir().obtenerSesion().id,'b');
  tabB.cerrarSesionLocal();assert.equal(tabB.obtenerSesion(),null);assert.equal(abrir().obtenerSesion(),null);
  assert.equal(tabA.obtenerSesion().id,'a');
});
