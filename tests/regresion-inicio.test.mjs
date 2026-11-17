import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { crearPersistencia } from '../js/persistencia-mvp.js';
import { espacioProductor } from '../js/identidad-mvp.js';
import { memoria } from './helpers.mjs';

const fuente=n=>readFileSync(new URL('../js/'+n+'.js',import.meta.url),'utf8');
const ana={id:'ana',establecimientoId:'campo-a',nombre:'Ana QA',autenticacionMvp:true};
const animal={id:'uno',caravanaVisual:'1111',codigoRFID:'000001',categoria:'Ternero',raza:'Hereford'};
function entorno(localStorage=memoria(),perfil=ana) {
  const sessionStorage=memoria();sessionStorage.setItem('ruraldata_sesion_productor_v2',JSON.stringify(perfil));
  const eventos=new EventTarget(),elementos=new Map();
  for(const id of ['listaAnimales','totalAnimalesListado','totalAnimalesCompletos','totalAnimalesPendientes','totalAnimalesCarencia','filtroListadoAnimales','usuarioActivo'])elementos.set(id,{value:'',textContent:'0',innerHTML:'',addEventListener(){},appendChild(){}});
  const document={addEventListener:eventos.addEventListener.bind(eventos),dispatchEvent:eventos.dispatchEvent.bind(eventos),getElementById:id=>elementos.get(id)||null,querySelector:()=>null,createElement:()=>({})};
  const window={location:{pathname:'/index.html'},addEventListener(){}};
  const c=vm.createContext({localStorage,sessionStorage,window,document,Event,crypto:webcrypto,console,setTimeout(){},setInterval(){},navigator:{locks:{request:async(n,o,fn)=>fn({})}},crearPersistencia,espacioProductor,
    crearSincronizador:({persistencia})=>({async sincronizar(){if(c.remoto)persistencia.recibir('animales',c.remoto);}})});
  for(const n of ['storage','listados','auth'])vm.runInContext(fuente(n),c);
  const iniciar=()=>vm.runInContext('(async()=>{'+fuente('integracion-mvp').replace(/^import .*;\r?\n/gm,'')+'})()',c);
  const cache=crearPersistencia({storage:localStorage,establecimientoId:espacioProductor(perfil)});
  return {c,elementos,cache,iniciar,localStorage};
}
const total=e=>Number(e.elementos.get('totalAnimalesListado').textContent);

test('se puede leer offline mientras Web Locks resuelve y el alta espera el permiso de escritura', async()=>{
  const e=entorno();
  e.cache.guardarColeccion('animales',[animal]);
  let resolverLock;
  e.c.navigator.locks.request=async(_nombre,_opciones,callback)=>{
    const lock=await new Promise(resolve=>{resolverLock=resolve;});
    return callback(lock);
  };
  const inicio=e.iniciar();
  assert.equal(e.c.obtenerAnimales()[0].id,animal.id);
  await inicio;
  const listado=e.c.inicializarListadoAnimales();
  assert.equal(total(e),1);
  assert.throws(()=>e.c.guardarAnimales([animal]),/Edición bloqueada/);

  vm.runInContext(fuente('animales'),e.c);
  for(const [id,value] of Object.entries({caravanaVisual:'2222',codigoRFID:'000002',categoria:'Ternero',raza:'Hereford',propietario:'',campo:'',estado:'Activo',observaciones:''}))e.elementos.set(id,{value});
  e.elementos.set('formAnimal',{reset(){}});
  e.c.mostrarMensajeRegistroAnimal=()=>{};
  const alta=e.c.registrarAnimal({preventDefault(){}});
  assert.equal(e.c.obtenerAnimales().length,1);
  resolverLock({});
  await Promise.all([alta,listado]);
  assert.equal(e.c.obtenerAnimales().length,2);
  assert.equal(total(e),2);
});

test('carga inicial espera persistencia; F5 restaura contadores sin interacción ni red',async()=>{
  const e=entorno();e.cache.guardarColeccion('animales',[animal]);
  const cargando=e.c.inicializarListadoAnimales();
  await e.iniciar();await cargando;assert.equal(total(e),1);
  const recarga=entorno(e.localStorage);await recarga.iniciar();await recarga.c.inicializarListadoAnimales();assert.equal(total(recarga),1);
});

test('altas y sincronización actualizan contadores con ficha abierta sin cambiar filtros',async()=>{
  const e=entorno();await e.iniciar();await e.c.inicializarListadoAnimales();
  vm.runInContext(fuente('animales'),e.c);
  for(const [id,value] of Object.entries({caravanaVisual:'1111',codigoRFID:'000001',categoria:'Ternero',raza:'Hereford',propietario:'',campo:'',estado:'Activo',observaciones:''}))e.elementos.set(id,{value});
  e.elementos.set('formAnimal',{reset(){}});
  e.c.mostrarMensajeRegistroAnimal=()=>{};
  await e.c.registrarAnimal({preventDefault(){}});assert.equal(total(e),1);
  assert.equal(Number(e.elementos.get('totalAnimalesPendientes').textContent),1);
  assert.equal(Number(e.elementos.get('totalAnimalesCompletos').textContent),0);
  assert.equal(Number(e.elementos.get('totalAnimalesCarencia').textContent),0);
  e.elementos.get('filtroListadoAnimales').value='inexistente';e.c.cambiarFiltroEstadoAnimales('completos');assert.equal(total(e),1);
  const antes=e.elementos.get('listaAnimales').innerHTML;
  e.c.document.querySelector=()=>({});
  e.c.remoto={...animal,id:'dos',caravanaVisual:'2222',codigoRFID:'000002',version:1};
  await e.c.window.RuralDataMvp.sincronizar();assert.equal(total(e),2);assert.equal(e.elementos.get('listaAnimales').innerHTML,antes);
  assert.equal(e.c.obtenerAnimalesFiltradosListado().length,0);
});

test('contadores aíslan productor y establecimiento compartiendo navegador',async()=>{
  const a=entorno();a.cache.guardarColeccion('animales',[animal]);await a.iniciar();await a.c.inicializarListadoAnimales();
  for(const perfil of [{...ana,id:'otro',nombre:'Otro'}, {...ana,establecimientoId:'otro-campo'}]){
    const b=entorno(a.localStorage,perfil);await b.iniciar();await b.c.inicializarListadoAnimales();assert.equal(total(b),0);
    b.c.guardarAnimales([{...animal,id:'ajeno'}]);assert.equal(total(b),1);assert.equal(total(a),1);
  }
});

test('login usa nombre del perfil validado y no el contexto de otra cuenta; escapa HTML',async()=>{
  const e=entorno();
  for(const id of ['mensajeLogin','btnIngresarLogin','usuario','password'])e.elementos.set(id,{value:'dato'});
  e.c.AbortSignal=AbortSignal;
  e.c.fetch=async()=>({ok:true,json:async()=>({ok:true,perfil:ana})});
  await e.c.iniciarSesion({preventDefault(){}});
  e.c.localStorage.setItem('ruraldata_contexto_offline_v2',JSON.stringify({...ana,id:'otro',nombre:'Otra cuenta'}));
  e.c.mostrarUsuarioActivo();assert.match(e.elementos.get('usuarioActivo').innerHTML,/<strong>Ana QA<\/strong>/);assert.doesNotMatch(e.elementos.get('usuarioActivo').innerHTML,/Otra cuenta/);
  e.c.guardarSesion({...ana,nombre:'<img src=x>'});e.c.mostrarUsuarioActivo();assert.match(e.elementos.get('usuarioActivo').innerHTML,/&lt;img src=x&gt;/);
});
