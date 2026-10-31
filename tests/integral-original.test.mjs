import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync,existsSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { crearPersistencia } from '../js/persistencia-mvp.js';
import { memoria,baseSintetica,llamar,passwordSintetica,productorSintetico,envSintetico as env } from './helpers.mjs';
import { crearSesionHandler } from '../server/sesion-handler.js';

function entorno(modulos) {
  const storage=memoria(),sessionStorage=memoria(),elementos=new Map(),avisos=[];
  sessionStorage.setItem('ruraldata_sesion_productor_v2',JSON.stringify({id:'productor-test',establecimientoId:'campo-test',autenticacionMvp:true}));
  const p=crearPersistencia({storage,establecimientoId:'integral-test'});
  const elemento=(id,value='')=>{
    const el={value,innerHTML:'',textContent:'',classList:{add(){},remove(){},toggle(){}},reset(){},focus(){},select(){},addEventListener(){},appendChild(){}};
    elementos.set(id,el);return el;
  };
  const c=vm.createContext({window:{RuralDataMvp:{listar:e=>p.listar(e),guardar:(e,r)=>p.guardarColeccion(e,r),sincronizar:async()=>{}}},
    localStorage:storage,sessionStorage,crypto:webcrypto,console,document:{addEventListener(){},getElementById:id=>elementos.get(id)||null,querySelector:()=>null,createElement:()=>({classList:{add(){},remove(){}},appendChild(){}})},
    confirm:()=>true,alert:s=>avisos.push(s),setTimeout(){},setInterval(){}});
  for(const mod of ['storage',...modulos])vm.runInContext(readFileSync(new URL('../js/'+mod+'.js',import.meta.url),'utf8'),c);
  return {c,p,storage,elemento,avisos};
}
const fechaHoy=()=>new Date().toLocaleDateString('en-CA');
function animal(c,id='animal-a',caravana='91000001') {c.guardarAnimales([...c.obtenerAnimales(),{id,caravanaVisual:caravana,codigoRFID:'8580000'+caravana,categoria:'Vaca',sexo:'Hembra',campo:'Campo sintético'}]);}
function tratamiento(c,id,libera) {c.guardarSanidad([...c.obtenerSanidad(),{id:'trat-'+id,animalId:id,tieneCarencia:true,diasCarencia:30,fechaAplicacion:fechaHoy(),fechaLiberacion:libera,producto:'QA'}]);}

test('sanidad registra todos los campos y carencias coherentes con embarque, TXT y lotes',()=>{
  const {c,elemento}=entorno(['sanidad','embarque','txt-snig','lotes-embarque']);animal(c);
  const campos={identificacionAnimal:'91000001',tipoControl:'Antibiótico',producto:'QA',numeroHabilitacion:'123',fechaAplicacion:fechaHoy(),fechaProxima:'',tieneCarencia:'si',diasCarencia:'30',dosis:'5 ml',viaAdministracion:'Oral',veterinarioFirmante:'Firma QA',observaciones:'Sanidad QA'};
  for(const [id,v] of Object.entries(campos))elemento(id,v);elemento('bloqueCarencia');
  c.registrarControlSanitario({preventDefault(){},target:{reset(){}}});
  const r=c.obtenerSanidad()[0];assert.equal(r.animalId,'animal-a');assert.equal(r.dosis,'5 ml');assert.equal(r.numeroHabilitacion,'123');
  assert.equal(c.obtenerAnimalesEnCarenciaActual().length,1);assert.equal(c.obtenerResultadoEmbarque().noAptos.length,1);
  assert.ok(c.obtenerCarenciasActivasPorAnimalTxt()['animal-a']);assert.ok(c.obtenerCarenciaActivaLoteEmbarque(c.obtenerAnimales()[0]));
  assert.equal(c.calcularFechaLiberacion('2024-02-28',2),'2024-03-01');
  for(const fecha of ['2020-01-01',fechaHoy(),'2099-12-31']) {
    const estados=[c.obtenerEstadoCarencia(fecha),c.obtenerEstadoCarenciaEmbarque(fecha),c.obtenerEstadoCarenciaTxt(fecha),c.obtenerEstadoCarenciaLoteEmbarque(fecha)];
    assert.equal(new Set(estados).size,1,'Frontera temporal inconsistente');
  }
});

test('reproducción admite animales históricos sin RFID y mantiene vínculo y aviso',()=>{
  const {c,elemento}=entorno(['reproduccion']);c.guardarAnimales([{id:'animal-a',caravanaVisual:'91000001',categoria:'Vaca'}]);
  for(const [id,v] of Object.entries({identificadorAnimal:'91000001',estadoReproductivo:'En gestación',fechaEstimadaParto:'2099-12-31',diasAviso:'15',observacionesReproduccion:'QA'}))elemento(id,v);
  const lista=elemento('listaReproduccion');c.registrarReproduccion({preventDefault(){},target:{reset(){}}});
  assert.equal(c.obtenerReproduccion()[0].animalId,'animal-a');assert.equal(c.obtenerReproduccion()[0].diasAviso,15);
  assert.match(lista.innerHTML,/91000001/);assert.match(c.generarAlertaParto({...c.obtenerReproduccion()[0],fechaEstimadaParto:'2020-01-01'}),/vencida/);
});

test('los módulos locales respetan el lock de otra pestaña sin modificar datos',()=>{
  const {c,storage}=entorno(['txt-snig','importar-txt']);
  c.window.RuralDataMvp.escritor=false;
  const antes=JSON.stringify([...Array(storage.length)].map((_,i)=>[storage.key(i),storage.getItem(storage.key(i))]));
  for(const fn of ['guardarSanidad','guardarReproduccion','guardarLotesEmbarque','guardarAnimalesLotesEmbarque','guardarListaTxt','guardarHistorialTxt','guardarArchivosProcesadosTxt'])assert.throws(()=>c[fn]([{id:'test'}]),/Edición bloqueada/);
  assert.equal(JSON.stringify([...Array(storage.length)].map((_,i)=>[storage.key(i),storage.getItem(storage.key(i))])),antes);
});

test('edición offline rechaza identificaciones vacías/duplicadas y pesajes ajenos sin perder la versión local',()=>{
  const {c,p}=entorno([]);animal(c);animal(c,'animal-b','91000002');
  const inicial=JSON.stringify(p.estado());
  const duplicado=c.obtenerAnimales();duplicado[0].caravanaVisual='91000002';
  assert.throws(()=>c.guardarAnimales(duplicado),/Datos inválidos/);
  const vacio=c.obtenerAnimales();vacio[0].caravanaVisual='';vacio[0].codigoRFID='';assert.throws(()=>c.guardarAnimales(vacio),/Datos inválidos/);
  assert.throws(()=>c.guardarPesajes([{id:'peso-ajeno',animalId:'ajeno',pesoKg:300}]),/Datos inválidos/);
  assert.equal(JSON.stringify(p.estado()),inicial);
});

test('texto de sanidad, reproducción y TXT no se interpreta como HTML ejecutable',()=>{
  const {c,elemento}=entorno(['sanidad','reproduccion','txt-snig','importar-txt']);
  const ataque='<img src=x onerror=alert(1)>';
  c.guardarReproduccion([{id:'r',animalId:'a',observaciones:ataque,categoria:ataque,fechaEstimadaParto:''}]);
  const lista=elemento('listaReproduccion');c.cargarRegistrosReproduccion();
  assert.ok(!lista.innerHTML.includes('<img'));assert.ok(lista.innerHTML.includes('&lt;img'));
  const mensaje=elemento('mensajeSanidad');c.mostrarMensajeSanidad(ataque,false);assert.ok(!mensaje.innerHTML.includes('<img'));
  const txt=elemento('resultadoTxt');c.mostrarResultadoTxt(ataque,'warning');assert.ok(!txt.innerHTML.includes('<img'));
  const literal=c.argumentoEventoMvp("id');alert(1);//");
  const decodificado=literal.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
  assert.equal(JSON.parse(decodificado),"id');alert(1);//");
});

test('lote revalida tratamiento posterior, evita duplicados y conserva la lectura original',()=>{
  const {c,elemento}=entorno(['lotes-embarque']);animal(c);
  elemento('nombreLoteEmbarque','Lote QA');elemento('fechaLoteEmbarque',fechaHoy());elemento('guiaLoteEmbarque','123');
  c.crearLoteEmbarque();elemento('identificadorAnimalLoteEmbarque','91000001');c.agregarAnimalAlLoteEmbarque();
  elemento('identificadorAnimalLoteEmbarque','91000001');c.agregarAnimalAlLoteEmbarque();
  assert.equal(c.obtenerAnimalesLotesEmbarque().length,1);const lectura=JSON.stringify(c.obtenerAnimalesLotesEmbarque());
  tratamiento(c,'animal-a','2099-12-31');
  assert.equal(c.obtenerAnimalesDelLoteActivo()[0].estado,'no_apto');
  assert.equal(c.obtenerResumenLoteEmbarque(c.obtenerLotesEmbarque()[0].id).aptos,0);
  let descargas=0;c.descargarArchivoTextoLoteEmbarque=()=>descargas++;c.exportarTxtLoteEmbarque();assert.equal(descargas,0);
  assert.equal(JSON.stringify(c.obtenerAnimalesLotesEmbarque()),lectura,'Reescribió lectura histórica');
  c.cerrarLoteEmbarqueActivo();assert.equal(c.obtenerLotesEmbarque()[0].estado,'cerrado');
  animal(c,'animal-b','91000002');elemento('identificadorAnimalLoteEmbarque','91000002');c.agregarAnimalAlLoteEmbarque();assert.equal(c.obtenerAnimalesLotesEmbarque().length,1);
});

test('TXT revalida carencias al descargar sin borrar lista ni historial anterior',()=>{
  const {c,elemento}=entorno(['txt-snig']);animal(c);animal(c,'animal-b','91000002');
  for(const caravana of ['91000001','91000002','91000002']){elemento('identificacionTxt',caravana);c.agregarAnimalAListaTxt({preventDefault(){}});}
  assert.equal(c.obtenerListaTxt().length,2);const listaAntes=JSON.stringify(c.obtenerListaTxt());
  const original=c.generarContenidoTxtPreventivo();assert.equal(original.split('\n').length,2);
  c.guardarHistorialTxtGenerado(original,'antes.txt',2);
  tratamiento(c,'animal-a','2099-12-31');const actual=c.generarContenidoTxtPreventivo();
  assert.ok(!actual.includes('91000001') && actual.includes('91000002'));
  const descargas=[];c.descargarContenidoTxt=(contenido,nombre)=>descargas.push({contenido,nombre});c.descargarTxtPreventivo();
  assert.equal(descargas.length,1);assert.equal(c.obtenerHistorialTxt()[0].cantidadAnimales,1);
  assert.equal(c.obtenerHistorialTxt().find(h=>h.nombreArchivo==='antes.txt').contenido,original);
  assert.equal(JSON.stringify(c.obtenerListaTxt()),listaAntes);
});

test('importación TXT clasifica registrados, nuevos, duplicados e inválidos y encola altas',()=>{
  const {c,p}=entorno(['importar-txt']);animal(c);
  const contenido=['[|858000091000001|27102026|120000|123|.|.|.|.|.|.|.|.|.|.|]',
    '[|858000091000002|27102026|120001|123|.|.|.|.|.|.|.|.|.|.|]',
    '[|858000091000002|27102026|120001|123|.|.|.|.|.|.|.|.|.|.|]','línea inválida'].join('\n');
  c.analizarContenidoTxtImportado(contenido,'qa.txt','firma-qa');
  const resultado=vm.runInContext('resultadoImportacionTxt',c);
  assert.equal(resultado.encontrados.length,1);assert.equal(resultado.noRegistrados.length,1);assert.equal(resultado.duplicados.length,1);assert.equal(resultado.invalidos.length,1);
  c.ingresarTodosLosAnimalesTxt();assert.equal(c.obtenerAnimales().length,2);assert.equal(c.obtenerArchivosProcesadosTxt().length,1);
  const nuevo=c.obtenerAnimales().find(a=>a.caravanaVisual==='91000002');assert.ok(p.estado().pendientes.some(op=>op.registroId===nuevo.id));
  c.analizarContenidoTxtImportado(contenido,'qa.txt','firma-qa');c.ingresarTodosLosAnimalesTxt();assert.equal(c.obtenerAnimales().length,2);
});

test('listado muestra datos locales antes de resolver una red lenta y no destruye ficha abierta',async()=>{
  const {c,elemento}=entorno(['listados']);elemento('listaAnimales');let mostrar=0,resolver;
  c.mostrarListadoAnimales=()=>mostrar++;c.inicializarFiltrosEstadoAnimales=()=>{};
  c.window.RuralDataMvp.sincronizar=()=>new Promise(r=>{resolver=r;});
  const cargando=c.inicializarListadoAnimales();assert.equal(mostrar,1);
  c.document.querySelector=()=>({id:'formEditarAnimalListado_animal-a'});resolver();await cargando;assert.equal(mostrar,1);
});

test('PWA precachea archivos reales, recupera navegación offline y deja API fuera de caché',async()=>{
  const handlers={},almacen=new Map(),origin='https://qa.local',eliminadas=[];let online=true,errorServidor=false;
  const key=r=>new URL(typeof r==='string'?r:r.url,origin+'/').href;
  const cache={async put(req,res){almacen.set(key(req),res);},async match(req){return almacen.get(key(req));}};
  const c=vm.createContext({URL,console,self:{location:{origin},clients:{claim(){}},skipWaiting(){},addEventListener:(n,fn)=>handlers[n]=fn},
    caches:{open:async()=>cache,match:async req=>cache.match(req),keys:async()=>['ruraldata-cache-v1','otra-app'],delete:async nombre=>{eliminadas.push(nombre);}},
    fetch:async req=>{if(!online)throw new Error('Offline');return {ok:!errorServidor,clone(){return this;}};}});
  vm.runInContext(readFileSync(new URL('../service-worker.js',import.meta.url),'utf8'),c);
  for(const file of vm.runInContext('ARCHIVOS_CACHE',c))assert.ok(file==='./' || existsSync(new URL('../'+file,import.meta.url)),file+' ausente');
  let instalado;handlers.install({waitUntil:p=>instalado=p});await instalado;online=false;
  let respuesta;handlers.fetch({request:{method:'GET',url:origin+'/pages/sanidad.html',mode:'navigate'},respondWith:p=>respuesta=p});assert.ok(await respuesta);
  let api=false;handlers.fetch({request:{method:'GET',url:origin+'/api/animales',mode:'cors'},respondWith(){api=true;}});assert.equal(api,false);
  assert.equal([...almacen.keys()].some(k=>new URL(k).pathname.startsWith('/api/')),false);
  const antes=await cache.match('/pages/sanidad.html');online=true;errorServidor=true;
  handlers.fetch({request:{method:'GET',url:origin+'/pages/sanidad.html',mode:'navigate'},respondWith:p=>respuesta=p});
  assert.equal(await respuesta,antes,'Un error de servidor sustituyó la página cacheada');
  let activado;handlers.activate({waitUntil:p=>activado=p});await activado;
  assert.deepEqual(eliminadas,['ruraldata-cache-v1']);
});

test('migraciones conservan email y hash históricos y permiten login por mayúsculas/espacios sin cambiar IDs',async t=>{
  const {db,dbFactory}=baseSintetica(t);
  db.prepare('UPDATE usuarios SET email=? WHERE id=?').run('  Historico@QA.LOCAL  ',productorSintetico.id);
  const antes=db.prepare('SELECT * FROM usuarios WHERE id=?').get(productorSintetico.id);
  const login=await llamar(crearSesionHandler({env,dbFactory}),{method:'POST',headers:{origin:env.RURALDATA_ALLOWED_ORIGIN,'content-type':'application/json'},body:{email:'historico@qa.local',password:passwordSintetica}});
  assert.equal(login.statusCode,200);assert.equal(login.body.perfil.id,antes.id);assert.equal(login.body.perfil.establecimientoId,antes.establecimiento_id);
  assert.deepEqual(db.prepare('SELECT * FROM usuarios WHERE id=?').get(antes.id),antes);
});
