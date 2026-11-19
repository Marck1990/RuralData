import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {crearPersistencia} from '../js/persistencia-mvp.js';
import {memoria} from './helpers.mjs';
const fuente=n=>readFileSync(new URL('../js/'+n+'.js',import.meta.url),'utf8');
function entorno(storage=memoria(),perfil={id:'ana',establecimientoId:'campo-a',autenticacionMvp:true}) {
 const sessionStorage=memoria();sessionStorage.setItem('ruraldata_sesion_productor_v2',JSON.stringify(perfil));
 const eventos=new EventTarget(),elementos=new Map();
 const elemento=(id,value='')=>{const el={value,innerHTML:'',textContent:'0',children:[],classList:{add(){},remove(){}},reset(){},focus(){},select(){},addEventListener(){},appendChild(n){this.children.push(n);}};elementos.set(id,el);return el;};
 const document={addEventListener:eventos.addEventListener.bind(eventos),dispatchEvent:eventos.dispatchEvent.bind(eventos),getElementById:id=>elementos.get(id)||null,createElement:()=>({innerHTML:'',get firstElementChild(){return this.innerHTML;}})};
 const c=vm.createContext({localStorage:storage,sessionStorage,document,window:{addEventListener(){}},Event,crypto:webcrypto,console,setTimeout(){},clearTimeout(){},setInterval(){},Date:class extends Date{constructor(...args){super(...(args.length?args:['2026-11-14T12:00:00']));}}});
 for(const n of ['storage','animales','sanidad','embarque','lotes-embarque','txt-snig'])vm.runInContext(fuente(n),c);
 const p=crearPersistencia({storage,establecimientoId:c.obtenerEstablecimientoActivo()});
 const iniciar=()=>{c.window.RuralDataMvp={sanidadVerificada:true,listar:e=>p.listar(e),guardar(e,r){p.guardarColeccion(e,r);document.dispatchEvent(new Event('ruraldata:datos'));}};document.dispatchEvent(new Event('ruraldata:lista'));};
 for(const id of ['totalAptosEmbarque','totalNoAptosEmbarque','listaNoAptosEmbarque','listaAptosEmbarque','identificacionEmbarque','resultadoBusquedaEmbarque'])elemento(id);
 return {c,storage,elemento,elementos,iniciar,persistencia:p};
}
async function circuito(e) {
 e.iniciar();
 for(const [id,value] of Object.entries({caravanaVisual:'1111',codigoRFID:'000001',propietario:'',campo:'',categoria:'Ternero',raza:'Hereford',estado:'Activo',observaciones:''}))e.elemento(id,value);
 e.elemento('formAnimal');e.c.mostrarMensajeRegistroAnimal=()=>{};await e.c.registrarAnimal({preventDefault(){}});
 const campos={identificacionAnimal:'1111',tipoControl:'Clínico',producto:'Ficticio QA',numeroHabilitacion:'',fechaAplicacion:'2026-11-13',fechaProxima:'',tieneCarencia:'si',diasCarencia:'10',dosis:'',viaAdministracion:'',veterinarioFirmante:'',observaciones:''};
 for(const [id,value] of Object.entries(campos))e.elemento(id,value);
 e.c.registrarControlSanitario({preventDefault(){},target:{reset(){}}});
 assert.equal(e.c.obtenerSanidad()[0].fechaLiberacion,'2026-11-23');
}
function comprobar(e){
 assert.equal(Number(e.elementos.get('totalNoAptosEmbarque').textContent),1);assert.equal(Number(e.elementos.get('totalAptosEmbarque').textContent),0);
 assert.match(e.elementos.get('listaNoAptosEmbarque').children.join(''),/1111[\s\S]*NO APTO[\s\S]*23\/11\/2026/);
}
test('circuito real animal → sanidad → embarque, carga inicial tardía y F5',async()=>{
 const e=entorno();await circuito(e);
 const api=e.c.window.RuralDataMvp;delete e.c.window.RuralDataMvp;
 const carga=e.c.inicializarEmbarque();e.c.window.RuralDataMvp=api;e.c.document.dispatchEvent(new Event('ruraldata:lista'));await carga;comprobar(e);
 e.elementos.get('identificacionEmbarque').value='1111';await e.c.verificarAptitudPorBusqueda();assert.equal(e.elementos.get('identificacionEmbarque').value,'1111');assert.match(e.elementos.get('resultadoBusquedaEmbarque').innerHTML,/NO APTO/);
 const f5=entorno(e.storage);f5.iniciar();await f5.c.inicializarEmbarque();comprobar(f5);
 const otro=entorno(e.storage,{id:'otro',establecimientoId:'campo-a',autenticacionMvp:true});otro.iniciar();await otro.c.inicializarEmbarque();assert.equal(Number(otro.elementos.get('totalNoAptosEmbarque').textContent),0);
});
test('tratamiento posterior refresca contadores y bloquea alta manual, importación y exportación de lotes/TXT',async()=>{
 const e=entorno();e.iniciar();await e.c.inicializarEmbarque();await circuito(e);comprobar(e);
 e.c.guardarLotesEmbarque([{id:'lote',estado:'abierto'}]);vm.runInContext("loteEmbarqueActivoId='lote'",e.c);
 e.elemento('identificadorAnimalLoteEmbarque','1111');e.c.agregarAnimalAlLoteEmbarque();assert.equal(e.c.obtenerAnimalesLotesEmbarque().length,0);
 const registrados=e.c.obtenerAnimales();registrados[0].codigoRFID='858000000001111';e.c.guardarAnimales(registrados);
 e.c.procesarContenidoTxtLoteEmbarque('858000000001111');assert.equal(e.c.obtenerAnimalesLotesEmbarque().length,0);
 const a=e.c.obtenerAnimales()[0];e.c.guardarAnimalesLotesEmbarque([{id:'historico',loteId:'lote',animalId:a.id,estado:'apto'}]);let descargas=0;e.c.descargarArchivoTextoLoteEmbarque=()=>descargas++;e.c.exportarTxtLoteEmbarque();assert.equal(descargas,0);
 assert.equal(e.c.obtenerListaTxtAptaActual([{animalId:a.id,caravanaOchoDigitos:'00001111'}]).length,0);
});
test('carencia incompleta o fecha inválida nunca libera; frontera de liberación se recalcula',async()=>{
 const e=entorno();await circuito(e);const r=e.c.obtenerSanidad()[0],a=e.c.obtenerAnimales()[0];
 for(const fecha of ['', '2026-02-30','inválida']){
 e.c.guardarSanidad([{...r,fechaLiberacion:fecha}]);assert.equal(e.c.obtenerResultadoEmbarque().aptos.length,0);assert.ok(e.c.obtenerCarenciaActivaLoteEmbarque(a).datosIncompletos);assert.ok(e.c.obtenerCarenciasActivasPorAnimalTxt()[a.id]);
 }
 e.c.guardarSanidad([{...r,fechaLiberacion:'2026-11-14'}]);assert.equal(e.c.obtenerResultadoEmbarque().aptos.length,1);
});

function historialConCaravanasDuplicadas() {
 const e = entorno();
 e.iniciar();
 const animales = [
  {id:'a', caravanaVisual:'91000001', codigoRFID:'858000091000001'},
  {id:'b', caravanaVisual:'91000001', codigoRFID:'858000091000002'},
  {id:'c', caravanaVisual:'91000003', codigoRFID:'858000091000003'}
 ];
 // La sincronización puede traer duplicados históricos que el alta local rechaza.
 for (const animal of animales) e.persistencia.recibir('animales', {...animal, version:1});
 return {...e, animales};
}

const carenciaVigente = {id:'control', tieneCarencia:true, diasCarencia:10, fechaLiberacion:'2026-11-23'};

test('carencia histórica sin animalId prioriza el RFID inequívoco sobre una caravana duplicada', async () => {
 const e = historialConCaravanasDuplicadas();
 const [a,b,c] = e.animales;
 for (const identificadores of [
  {caravanaVisual:b.caravanaVisual, codigoRFID:b.codigoRFID},
  {caravanaVisual:b.caravanaVisual, identificacion:b.codigoRFID},
  {animalId:b.id, caravanaVisual:b.caravanaVisual, codigoRFID:b.codigoRFID}
 ]) {
  e.c.guardarSanidad([{...carenciaVigente, ...identificadores}]);
  const resultado = e.c.obtenerResultadoEmbarque();
  assert.equal([...resultado.aptos].map(animal=>animal.id).sort().join(','), 'a,c');
  assert.equal(resultado.noAptos[0].animal.id, b.id);
  assert.equal(e.c.obtenerCarenciaActivaLoteEmbarque(a), null);
  assert.equal(e.c.obtenerCarenciaActivaLoteEmbarque(b).fechaLiberacion, '2026-11-23');
  assert.equal(e.c.obtenerListaTxtAptaActual([{animalId:b.id}, {animalId:c.id}])[0].animalId, c.id);
 }
 e.elementos.get('identificacionEmbarque').value = b.caravanaVisual;
 await e.c.verificarAptitudPorBusqueda();
 assert.match(e.elementos.get('resultadoBusquedaEmbarque').innerHTML, /Identificación ambigua/);
 assert.equal(e.c.identificarAnimalSanidad(b.caravanaVisual).ambiguo, true);
 assert.equal(e.c.identificarAnimalSanidad(b.codigoRFID).animal.id, b.id);
 e.elementos.get('identificacionEmbarque').value = b.codigoRFID;
 await e.c.verificarAptitudPorBusqueda();
 assert.match(e.elementos.get('resultadoBusquedaEmbarque').innerHTML, /NO APTO/);
 e.c.guardarLotesEmbarque([{id:'lote', estado:'abierto'}]);
 vm.runInContext("loteEmbarqueActivoId='lote'", e.c);
 e.elemento('identificadorAnimalLoteEmbarque', b.caravanaVisual);
 e.c.agregarAnimalAlLoteEmbarque();
 e.c.procesarContenidoTxtLoteEmbarque(b.codigoRFID);
 assert.equal(e.c.obtenerAnimalesLotesEmbarque().length, 0);
 e.c.procesarContenidoTxtLoteEmbarque(a.codigoRFID);
 assert.equal(e.c.obtenerAnimalesLotesEmbarque()[0].animalId, a.id);
 assert.equal(e.c.obtenerListaTxtAptaActual([{animalId:a.id}]).length, 0, 'El código SNIG de ocho dígitos es ambiguo');
});

test('contradicciones y duplicados bloquean a los candidatos sin atribuirles el tratamiento', () => {
 const e = historialConCaravanasDuplicadas();
 const [a,b,c] = e.animales;
 for (const identificadores of [
  {animalId:a.id, codigoRFID:b.codigoRFID},
  {codigoRFID:b.codigoRFID, caravanaVisual:c.caravanaVisual},
  {caravanaVisual:a.caravanaVisual},
  {animalId:'id-historico-ausente', caravanaVisual:a.caravanaVisual}
 ]) {
  const registro = {...carenciaVigente, ...identificadores};
  e.c.guardarSanidad([registro]);
  const esperados = identificadores.caravanaVisual === c.caravanaVisual ? [b,c] : [a,b];
  const bloqueos = e.c.obtenerCarenciasActivasPorAnimalTxt();
  assert.equal(Object.keys(bloqueos).sort().join(','), esperados.map(animal=>animal.id).sort().join(','));
  for (const animal of esperados) {
   assert.match(e.c.obtenerCarenciaActivaLoteEmbarque(animal).motivoPreventivo, /Identificación ambigua/);
   assert.equal(bloqueos[animal.id].fechaLiberacion, undefined);
  }
  const resultadoTxt = e.elemento('resultadoTxt');
  e.elemento('identificacionTxt', esperados[0].codigoRFID);
  e.c.agregarAnimalAListaTxt({preventDefault(){}});
  assert.match(resultadoTxt.innerHTML, /Identificación ambigua/);
  assert.equal(JSON.stringify(e.c.obtenerSanidad()), JSON.stringify([registro]));
 }
 e.c.guardarSanidad([{...carenciaVigente, caravanaVisual:a.caravanaVisual, fechaLiberacion:'2026-11-14'}]);
 assert.equal(e.c.obtenerResultadoEmbarque().noAptos.length, 0);
 e.c.guardarSanidad([{...carenciaVigente, caravanaVisual:c.caravanaVisual}]);
 assert.equal(e.c.obtenerResultadoEmbarque().noAptos[0].animal.id, c.id);
 e.c.guardarSanidad([{...carenciaVigente, animalId:'sin-referencia-en-cache'}]);
 assert.equal(e.c.obtenerResultadoEmbarque().noAptos.length, 3);
});

test('una lectura abreviada y un código de exportación compartidos no identifican un animal', async () => {
 const e = historialConCaravanasDuplicadas();
 const [a,b] = e.animales;
 const duplicado = {...b, codigoRFID:'999000091000001', version:2};
 e.persistencia.recibir('animales', duplicado);
 e.elementos.get('identificacionEmbarque').value = '91000001';
 await e.c.verificarAptitudPorBusqueda();
 assert.match(e.elementos.get('resultadoBusquedaEmbarque').innerHTML, /Identificación ambigua/);
 e.c.guardarLotesEmbarque([{id:'lote', estado:'abierto'}]);
 vm.runInContext("loteEmbarqueActivoId='lote'", e.c);
 for (const rfid of [a.codigoRFID, duplicado.codigoRFID]) {
  e.elemento('identificadorAnimalLoteEmbarque', rfid);
  e.c.agregarAnimalAlLoteEmbarque();
 }
 assert.equal(e.c.obtenerAnimalesLotesEmbarque().length, 2);
 const resultado = e.elemento('resultadoLecturaLoteEmbarque');
 let descargas = 0;
 e.c.descargarArchivoTextoLoteEmbarque = () => descargas++;
 e.c.exportarTxtLoteEmbarque();
 assert.equal(descargas, 0);
 assert.match(resultado.innerHTML, /ocho dígitos ambiguas/);
});

test('sin verificación remota, Embarque, Lotes y TXT bloquean aun con historial vacío', () => {
 const e=historialConCaravanasDuplicadas();
 const animal=e.animales[2];
 e.c.window.RuralDataMvp.sanidadVerificada=false;
 assert.equal(e.c.obtenerResultadoEmbarque().aptos.length,0);
 assert.equal(e.c.obtenerCarenciaActivaLoteEmbarque(animal).aptitudNoVerificable,true);
 assert.equal(e.c.obtenerListaTxtAptaActual([{animalId:animal.id}]).length,0);
 e.c.guardarLotesEmbarque([{id:'lote',estado:'abierto'}]);
 vm.runInContext("loteEmbarqueActivoId='lote'",e.c);
 const aviso=e.elemento('resultadoLecturaLoteEmbarque');
 e.elemento('identificadorAnimalLoteEmbarque',animal.codigoRFID);
 e.c.agregarAnimalAlLoteEmbarque();
 assert.equal(e.c.obtenerAnimalesLotesEmbarque().length,0);
 assert.match(aviso.innerHTML,/Aptitud no verificable/);
 e.c.window.RuralDataMvp.sanidadVerificada=true;
 assert.equal(e.c.obtenerCarenciaActivaLoteEmbarque(animal),null);
});
