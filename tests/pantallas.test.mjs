import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { crearPersistencia } from '../js/persistencia-mvp.js';
import { memoria } from './helpers.mjs';

test('formularios originales de registro, listado y búsqueda usan la cola común sin fetch directo',async()=>{
  const storage=memoria();const persistencia=crearPersistencia({storage,establecimientoId:'campo-test'});
  const sessionStorage=memoria();
  sessionStorage.setItem('ruraldata_sesion_productor_v2',JSON.stringify({id:'productor-test',establecimientoId:'campo-test',autenticacionMvp:true}));
  const campos=new Map();const elemento=id=>{if(!campos.has(id))campos.set(id,{value:'',reset(){},classList:{remove(){},add(){}},addEventListener(){}});return campos.get(id);};
  const context=vm.createContext({window:{RuralDataMvp:{listar:e=>persistencia.listar(e),guardar:(e,r)=>persistencia.guardarColeccion(e,r)}},
    localStorage:storage,sessionStorage,crypto:webcrypto,console,document:{addEventListener(){},getElementById:elemento},
    setTimeout(){},alert:mensaje=>assert.fail(mensaje),confirm:()=>true,fetch:()=>assert.fail('Sin fetch directo desde formularios')});
  for(const file of ['storage','animales','listados','identificacion'])vm.runInContext(readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),context);
  for(const nombre of ['mostrarMensajeRegistroAnimal','mostrarSexoAutomatico','mostrarListadoAnimales','mostrarAnimalCompacto'])context[nombre]=()=>{};
  for(const [k,v]of Object.entries({caravanaVisual:'TEST-001',codigoRFID:'RFID-001',propietario:'Productor',campo:'Campo',categoria:'Vaca',raza:'Hereford',estado:'Activo',observaciones:'alta'}))elemento(k).value=v;
  await context.registrarAnimal({preventDefault(){}});
  const animal=persistencia.listar('animales')[0];assert.ok(animal.id);
  const valores={editarCaravanaVisual:'TEST-001',editarCodigoRFID:'RFID-001',editarCategoriaAnimal:'Vaca',editarSexoAnimal:'Hembra',editarRazaAnimal:'Hereford',editarFechaNacimientoAnimal:'',editarPropietarioAnimal:'Productor',editarCampoAnimal:'Campo',editarObservacionesAnimal:'primera edición'};
  context.mostrarMensajeBusquedaAnimal=()=>{};
  for(const [k,v]of Object.entries(valores))elemento(k).value=v;
  context.guardarCambiosAnimalBuscado(animal.id);
  for(const [k,v]of Object.entries(valores))elemento(k+'_'+animal.id).value=k==='editarObservacionesAnimal'?'segunda edición':v;
  await context.guardarCambiosAnimalListado(animal.id);
  assert.equal(persistencia.listar('animales')[0].observaciones,'segunda edición');
  assert.equal(persistencia.estado().pendientes.filter(p=>p.entidad==='animales').length,3);
  for(const sufijo of ['', 'Busqueda']) {
    elemento('fechaPesaje'+sufijo+'_'+animal.id).value='2026-01-02';
    elemento('pesoKg'+sufijo+'_'+animal.id).value='350';
    elemento('observacionPesaje'+sufijo+'_'+animal.id).value='sintético';
    elemento('pesajeEditando'+sufijo+'_'+animal.id).value='';
  }
  await context.guardarPesajeAnimalListado(animal.id);
  context.guardarPesajeAnimalIdentificacion(animal.id);
  assert.equal(persistencia.listar('pesajes').length,2);
  assert.ok(persistencia.listar('pesajes').every(p=>p.animalId===animal.id));
});

test('service worker no intercepta API ni sobrescribe index al navegar',()=>{
  const handlers={};let intercepted=false;
  const context=vm.createContext({self:{location:{origin:'https://ruraldata.test'},addEventListener:(n,fn)=>{handlers[n]=fn;}},URL});
  vm.runInContext(readFileSync(new URL('../service-worker.js',import.meta.url),'utf8'),context);
  for(const path of ['/api/animales','/api/pesajes','/api/sesion','/api/test-db'])handlers.fetch({request:{method:'GET',url:'https://ruraldata.test'+path,mode:'cors'},respondWith(){intercepted=true;}});
  assert.equal(intercepted,false);
});
