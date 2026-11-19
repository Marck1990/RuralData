import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,existsSync} from 'node:fs';
import {crearPersistencia} from '../js/persistencia-mvp.js';
import {memoria} from './helpers.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const ana={id:'ana-qa',nombre:'Ana QA',establecimientoId:'campo-ana',autenticacionMvp:true};
function entorno(localStorage=memoria(),perfil=ana) {
 const sessionStorage=memoria();sessionStorage.setItem('ruraldata_sesion_productor_v2',JSON.stringify(perfil));
 const clases=()=>{const valores=new Set();return {add:v=>valores.add(v),remove:v=>valores.delete(v),contains:v=>valores.has(v)};};
 const elemento=()=>Object.assign(new EventTarget(),{value:'',textContent:'0',innerHTML:'',classList:clases(),appendChild(){}});
 const elementos=new Map([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],elemento()]));
 const document=Object.assign(new EventTarget(),{body:elemento(),visibilityState:'visible',getElementById:id=>elementos.get(id)||null,createElement:elemento});
 const window=new EventTarget();
 const c=vm.createContext({localStorage,sessionStorage,document,window,Event,navigator:{},setInterval(){},console,Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-11-14T12:00:00']));}}});
 for(const n of ['storage','app'])vm.runInContext(readFileSync(new URL('../js/'+n+'.js',import.meta.url),'utf8'),c);
 const cache=crearPersistencia({storage:localStorage,establecimientoId:c.obtenerEstablecimientoActivo()});
 const emitir=(destino,tipo,props={})=>{const e=new Event(tipo);Object.assign(e,props);destino.dispatchEvent(e);};
 const conectar=()=>{window.RuralDataMvp={listar:e=>cache.listar(e),guardar:(e,r)=>{cache.guardarColeccion(e,r);emitir(document,'ruraldata:datos');}};emitir(document,'ruraldata:lista');};
 const cargar=()=>emitir(document,'DOMContentLoaded');
 const numeros=()=>['totalAnimales','totalSanidad','totalPariciones','totalAlertas'].map(id=>Number(elementos.get(id).textContent));
 return {c,localStorage,sessionStorage,document,window,elementos,cache,emitir,conectar,cargar,numeros};
}
function sembrar(e){
 e.cache.guardarColeccion('animales',Array.from({length:12},(_,i)=>({id:'animal-'+i,caravanaVisual:i===0?'1111':String(2000+i),categoria:'Ternero',metodoIngreso:i?'txt':'manual'})));
 e.cache.guardarColeccion('sanidad',[{id:'tratamiento',animalId:'animal-0',tipoControl:'Clínico',tieneCarencia:true,fechaLiberacion:'2026-11-23'}]);
}
test('menú se conecta antes de persistencia: abrir, cerrar, overlay y Escape sin alterar sesión',()=>{
 const e=entorno();const sesion=e.sessionStorage.getItem('ruraldata_sesion_productor_v2');e.cargar();
 const abierto=()=>e.elementos.get('menuLateralRural').classList.contains('abierto');
 for(const cerrar of [()=>e.emitir(e.elementos.get('btnCerrarMenuLateral'),'click'),()=>e.emitir(e.elementos.get('overlayMenuLateral'),'click'),()=>e.emitir(e.document,'keydown',{key:'Escape'})]){
 e.emitir(e.elementos.get('btnAbrirMenuLateral'),'click');assert.ok(abierto());assert.ok(e.document.body.classList.contains('menu-lateral-abierto'));cerrar();assert.equal(abierto(),false);
 }
 assert.equal(e.sessionStorage.getItem('ruraldata_sesion_productor_v2'),sesion);
});
test('gestos móviles existentes abren desde el borde y cierran deslizando',()=>{
 const e=entorno();e.cargar();
 e.emitir(e.document,'touchstart',{touches:[{clientX:10,clientY:100}]});e.emitir(e.document,'touchend',{changedTouches:[{clientX:140,clientY:110}]});assert.ok(e.elementos.get('menuLateralRural').classList.contains('abierto'));
 e.emitir(e.document,'touchstart',{touches:[{clientX:200,clientY:100}]});e.emitir(e.document,'touchend',{changedTouches:[{clientX:30,clientY:110}]});assert.equal(e.elementos.get('menuLateralRural').classList.contains('abierto'),false);
});
test('un solo menú con rutas reales a todas las pantallas y pesajes en listado existente',()=>{
 assert.equal([...html.matchAll(/id="menuLateralRural"/g)].length,1);
 const nav=html.match(/<nav class="app-rural-side-nav">([\s\S]*?)<\/nav>/)[1];
 const rutas=[...nav.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 for(const pagina of ['registrar-animal','listar-animales','buscar-animal','sanidad','reproduccion','listar-controles','embarque','lotes-embarque','txt-snig','importar-txt','resumen'])assert.ok(rutas.includes('pages/'+pagina+'.html'),pagina);
 for(const ruta of rutas)assert.ok(existsSync(new URL('../'+ruta,import.meta.url)),ruta);
 assert.match(nav,/Ver animales \/ Pesajes/);
});
test('12 animales y tratamiento se cuentan al estar lista la caché, también después de F5',()=>{
 const e=entorno();sembrar(e);e.cargar();e.conectar();assert.deepEqual(e.numeros(),[12,1,0,1]);
 const f5=entorno(e.localStorage);f5.conectar();f5.cargar();assert.deepEqual(f5.numeros(),[12,1,0,1]);
});
test('actualiza al guardar, sincronizar y volver desde módulos; conserva definiciones de pariciones y alertas',()=>{
 const e=entorno();e.conectar();e.cargar();sembrar(e);e.emitir(e.document,'ruraldata:datos');assert.deepEqual(e.numeros(),[12,1,0,1]);
 e.c.guardarReproduccion([{id:'futura',fechaEstimadaParto:'2026-12-30',diasAviso:15},{id:'cercana',fechaEstimadaParto:'2026-11-20',diasAviso:15},{id:'vencida',fechaEstimadaParto:'2026-11-13',diasAviso:15}]);
 e.emitir(e.window,'pageshow');assert.deepEqual(e.numeros(),[12,1,2,3]);
 e.cache.recibir('animales',{id:'sincronizado',caravanaVisual:'9999',categoria:'Vaca',version:1});e.emitir(e.document,'ruraldata:datos');assert.equal(e.numeros()[0],13);
 e.c.guardarSanidad([...e.c.obtenerSanidad(),{id:'otro-control',animalId:'animal-0',fechaLiberacion:'2026-11-24'}]);assert.deepEqual(e.numeros(),[13,2,2,3]);
 e.c.guardarReproduccion([]);e.emitir(e.document,'visibilitychange');assert.deepEqual(e.numeros(),[13,2,0,1]);
});
test('dos productores y dos establecimientos mantienen indicadores separados; storage filtra cuenta activa',()=>{
 const a=entorno();sembrar(a);a.conectar();a.cargar();
 for(const perfil of [{...ana,id:'otro'}, {...ana,establecimientoId:'otro-campo'}]){
 const b=entorno(a.localStorage,perfil);b.conectar();b.cargar();assert.deepEqual(b.numeros(),[0,0,0,0]);
 b.c.guardarAnimales([{id:'ajeno',caravanaVisual:'1111'}]);assert.deepEqual(b.numeros(),[1,0,0,0]);assert.deepEqual(a.numeros(),[12,1,0,1]);
 }
 a.cache.recibir('animales',{id:'remoto',categoria:'Vaca',version:1});
 a.emitir(a.window,'storage',{key:'ruraldata_mvp_v1_productor_otro_establecimiento_campo-ana'});assert.equal(a.numeros()[0],12);
 a.emitir(a.window,'storage',{key:'ruraldata_mvp_v1_'+a.c.obtenerEstablecimientoActivo()});assert.equal(a.numeros()[0],13);
});
