const frame=document.getElementById('app'),lista=document.getElementById('resultados'),resultados=[];
const laboratorioLocal=location.origin==='http://localhost:43187';
if(!laboratorioLocal){
  document.getElementById('iniciar').disabled=true;document.getElementById('offline').disabled=true;
  lista.textContent='Laboratorio deshabilitado: solo funciona en http://localhost:43187 con servidor sintético.';
}
for(const [id,disponible] of [['pausar-api',false],['restablecer-api',true]]) {
  document.getElementById(id).disabled=!laboratorioLocal;
  document.getElementById(id).onclick=async()=>{
    if(!laboratorioLocal)return;
    const estado=document.getElementById('estado-manual');
    try {
      await control({apiDisponible:disponible});
      estado.textContent=disponible ? 'API restablecida. Volvé a la aplicación y pulsá Sincronizar.'
        : 'API sin conexión simulada. Podés cargar cambios y recargar la aplicación; no detengas el servidor.';
    }catch{estado.textContent='No respondió el laboratorio. Informá el error antes de reiniciar.';}
  };
}
const esperar=async(fn,limite=18000)=>{const inicio=Date.now();while(Date.now()-inicio<limite){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,80));}throw new Error('Tiempo agotado');};
const comprobar=(valor,mensaje)=>{if(!valor)throw new Error(mensaje);};
const w=()=>frame.contentWindow;
async function control(body){const r=await fetch('/__prueba__/control',{method:'POST',headers:{'Content-Type':'application/json','X-RuralData-Test':'local-only'},body:JSON.stringify(body)});comprobar(r.ok,'Control local falló');}
async function paso(nombre,fn){
  const li=document.createElement('li');li.textContent=nombre+' — ejecutando';lista.append(li);
  try{await fn();resultados.push({nombre,estado:'OK'});li.textContent=nombre+' — OK';}
  catch(error){resultados.push({nombre,estado:'FALLO',detalle:error.message});li.textContent=nombre+' — FALLO: '+error.message;}
  await control({resultados});
}
async function navegar(ruta){
  await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(new Error('No cargó '+ruta)),20000);frame.onload=()=>{clearTimeout(t);resolve();};frame.src=ruta;});
  await esperar(()=>w().document.readyState==='complete');
  comprobar(!w().erroresQA?.length,'Error de página: '+w().erroresQA?.join('; '));
}
function llenar(id,valor){const el=w().document.getElementById(id);comprobar(el,'No existe #'+id);el.value=valor;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
function enviar(id){const form=w().document.getElementById(id);comprobar(form,'No existe formulario '+id);comprobar(form.reportValidity(),'Validación de formulario '+id);form.requestSubmit();}
const sufijo=Date.now(),correoA=`ana-${sufijo}@qa.local`,correoB=`bruno-${sufijo}@qa.local`;
// Credencial exclusivamente sintética del laboratorio; no se imprime en resultados.
const clave='Prueba local sin datos reales 2026!';
let perfilA,perfilB,animalId,segundoId,loteId;
const hoy=new Date().toLocaleDateString('en-CA');
async function registrar(nombre,email){
  await navegar('/registro-usuario.html');llenar('nombreRegistro',nombre);llenar('usuarioRegistro',email);llenar('passwordRegistro',clave);llenar('establecimientoRegistro','Campo QA '+nombre);enviar('formRegistroUsuario');
  await esperar(()=>w().document.getElementById('mensajeRegistroUsuario').textContent.includes('registrado'));
}
async function login(email){
  await navegar('/login.html');llenar('usuario',email);llenar('password',clave);enviar('formLogin');
  await esperar(()=>w().location.pathname==='/index.html' && w().obtenerSesion?.());
  await esperar(()=>w().document.readyState==='complete');return w().obtenerSesion();
}
async function crearAnimal(caravana){
  await navegar('/pages/registrar-animal.html');
  for(const [id,v]of Object.entries({caravanaVisual:caravana,codigoRFID:'8580000'+caravana,propietario:'QA',campo:'QA',categoria:'Vaca',raza:'Hereford',estado:'Activo',observaciones:'Dato sintético'}))llenar(id,v);
  enviar('formAnimal');await esperar(()=>w().obtenerAnimales().some(a=>a.caravanaVisual===caravana));
  return w().obtenerAnimales().find(a=>a.caravanaVisual===caravana).id;
}
document.getElementById('iniciar').onclick=async()=>{
  if(!laboratorioLocal)return;
  document.getElementById('iniciar').disabled=true;
  await paso('Registro público de dos productores desde formularios reales',async()=>{await registrar('Ana QA',correoA);await registrar('Bruno QA',correoB);});
  await paso('Login y cookie HttpOnly/Secure aceptada por Chrome en localhost',async()=>{
    perfilA=await login(correoA);const r=await w().fetch('/api/sesion');comprobar(r.ok,'No se recibió cookie de sesión');
    comprobar(!w().document.cookie.includes('__Host-ruraldata'),'La cookie es accesible por JavaScript');
  });
  await paso('Alta de animales con API fuera de servicio, recarga y datos conservados',async()=>{
    await control({apiDisponible:false});animalId=await crearAnimal('91000001');segundoId=await crearAnimal('91000002');
    await navegar('/pages/registrar-animal.html');comprobar(w().obtenerAnimales().length===2,'Se perdieron animales al recargar');
  });
  await paso('Búsqueda por caravana y edición en ficha',async()=>{
    await navegar('/pages/buscar-animal.html');llenar('identificacionBusqueda','91000001');enviar('formBuscarAnimal');
    comprobar(w().document.body.textContent.includes('91000001'),'No se muestra la búsqueda');
    w().desplegarFichaAnimal(animalId);llenar('editarObservacionesAnimal','Edición desde búsqueda');enviar('formEditarAnimalBuscado');
    comprobar(w().obtenerAnimales().find(a=>a.id===animalId).observaciones==='Edición desde búsqueda','No se guardó edición');
  });
  await paso('Listado, segunda edición pendiente y pesaje desde listado',async()=>{
    await navegar('/pages/listar-animales.html');await esperar(()=>w().document.getElementById('listaAnimales').textContent.includes('91000001'));
    w().desplegarFichaAnimalListado(animalId);llenar('editarObservacionesAnimal_'+animalId,'Segunda edición');enviar('formEditarAnimalListado_'+animalId);
    w().desplegarPesajesAnimalListado(animalId);llenar('fechaPesaje_'+animalId,hoy);llenar('pesoKg_'+animalId,'350');llenar('observacionPesaje_'+animalId,'Listado');
    await w().guardarPesajeAnimalListado(animalId);comprobar(w().obtenerPesajes()[0].animalId===animalId,'Pesaje perdió animalId');
  });
  await paso('Pesaje desde ficha de búsqueda y recuperación tras recarga',async()=>{
    await navegar('/pages/buscar-animal.html');llenar('identificacionBusqueda','91000001');enviar('formBuscarAnimal');w().desplegarPesajesAnimalIdentificacion(animalId);
    llenar('fechaPesajeBusqueda_'+animalId,hoy);llenar('pesoKgBusqueda_'+animalId,'360');llenar('observacionPesajeBusqueda_'+animalId,'Búsqueda');
    w().guardarPesajeAnimalIdentificacion(animalId);await navegar('/pages/buscar-animal.html');comprobar(w().obtenerPesajes().length===2,'No se conservaron ambos pesajes');
  });
  await paso('Sanidad: alta real con carencia y consulta',async()=>{
    await navegar('/pages/sanidad.html');
    for(const [id,v]of Object.entries({identificacionAnimal:'91000001',tipoControl:'Antibiótico',producto:'Producto QA',fechaAplicacion:hoy,tieneCarencia:'si',diasCarencia:'30'}))llenar(id,v);
    enviar('formSanidad');comprobar(w().obtenerSanidad().length===1,'No se guardó sanidad');comprobar(w().obtenerAnimalesEnCarenciaActual().length===1,'No se detectó carencia');
  });
  await paso('Reproducción: registro y aviso en la pantalla original',async()=>{
    await navegar('/pages/reproduccion.html');llenar('identificadorAnimal','91000001');llenar('estadoReproductivo','En gestación');llenar('fechaEstimadaParto',hoy);llenar('observacionesReproduccion','Reproducción QA');enviar('formReproduccion');
    comprobar(w().obtenerReproduccion()[0].animalId===animalId,'Reproducción perdió relación');comprobar(w().document.getElementById('listaReproduccion').textContent.includes('91000001'),'No se muestra reproducción');
  });
  await paso('Embarque: un animal bloqueado y uno apto',async()=>{
    await navegar('/pages/embarque.html');const r=w().obtenerResultadoEmbarque();comprobar(r.aptos.length===1 && r.noAptos.length===1,'Aptitud incorrecta');
  });
  await paso('Lote: alta, lectura, duplicados, cierre y contenido TXT',async()=>{
    await navegar('/pages/lotes-embarque.html');llenar('nombreLoteEmbarque','Lote QA');llenar('fechaLoteEmbarque',hoy);llenar('guiaLoteEmbarque','123');w().crearLoteEmbarque();loteId=w().obtenerLotesEmbarque()[0].id;
    for(const car of ['91000001','91000002','91000002']){llenar('identificadorAnimalLoteEmbarque',car);w().agregarAnimalAlLoteEmbarque();}
    const r=w().obtenerResumenLoteEmbarque(loteId);comprobar(r.total===2 && r.aptos===1 && r.noAptos===1,'Lote no conserva aptitud/duplicados');
    const linea=w().crearLineaTxtLoteEmbarque(w().obtenerAnimalesDelLoteActivo().find(a=>a.estado==='apto'),'123');comprobar(linea.includes('91000002'),'Contenido TXT incorrecto');
    w().cerrarLoteEmbarqueActivo();comprobar(w().obtenerLotesEmbarque()[0].estado==='cerrado','No cierra lote');
  });
  await paso('TXT preventivo: bloqueo sanitario, duplicado y generación/historial',async()=>{
    await navegar('/pages/txt-snig.html');
    for(const car of ['91000001','91000002','91000002']){llenar('identificacionTxt',car);w().agregarAnimalAListaTxt({preventDefault(){}});}
    comprobar(w().obtenerListaTxt().length===1,'Lista TXT acepta carencia o duplicado');
    const contenido=w().generarContenidoTxtPreventivo();comprobar(contenido.includes('91000002') && !contenido.includes('91000001'),'Contenido TXT incluye carencia');
    w().guardarHistorialTxtGenerado(contenido,'sintetico.txt',1);comprobar(w().obtenerHistorialTxt()[0].contenido===contenido,'Historial TXT no conserva contenido');
  });
  await paso('Importación TXT mediante FileReader, duplicados y alta de animal nuevo',async()=>{
    await navegar('/pages/importar-txt.html');const texto='[|858000091000002|27102026|120000|123|.|.|.|.|.|.|.|.|.|.|]\n[|858000091000003|27102026|120001|123|.|.|.|.|.|.|.|.|.|.|]\n[|858000091000003|27102026|120001|123|.|.|.|.|.|.|.|.|.|.|]';
    const datos=new w().DataTransfer();datos.items.add(new w().File([texto],'sintetico.txt',{type:'text/plain'}));w().document.getElementById('archivoTxtImportado').files=datos.files;
    w().procesarArchivoTxtImportado();await esperar(()=>w().obtenerArchivosProcesadosTxt().length===1);
    w().ingresarTodosLosAnimalesTxt();comprobar(w().obtenerAnimales().length===3,'Importación no evita duplicados o no crea el animal');
  });
  await paso('Recuperación de API: sincroniza animales/pesajes sin cambiar IDs',async()=>{
    await control({apiDisponible:true});await w().RuralDataMvp.sincronizar();
    const a=await (await w().fetch('/api/animales')).json(),p=await(await w().fetch('/api/pesajes')).json();
    comprobar(a.animales.length===3 && p.pesajes.length===2,'No sincronizó todo');comprobar(p.pesajes.every(p=>p.animalId===animalId),'Cambió vínculo de pesajes');
  });
  await paso('Sesión vencida conserva locales y reautenticación recupera pendientes',async()=>{
    await control({sesionVencida:true});const animales=w().obtenerAnimales();animales[0].observaciones='Pendiente tras vencimiento';w().guardarAnimales(animales);await w().RuralDataMvp.sincronizar();
    comprobar(w().obtenerAnimales()[0].observaciones==='Pendiente tras vencimiento','Perdió edición al expirar');
    await control({sesionVencida:false});await login(correoA);await w().RuralDataMvp.sincronizar();
  });
  await paso('Logout y segundo productor: ningún módulo consulta datos del primero',async()=>{
    await w().cerrarSesion();await esperar(()=>w().location.pathname==='/login.html');perfilB=await login(correoB);
    comprobar(perfilB.establecimientoId!==perfilA.establecimientoId,'Comparten establecimiento');
    for(const f of ['obtenerAnimales','obtenerPesajes','obtenerSanidad','obtenerReproduccion','obtenerLotesEmbarque','obtenerAnimalesLotesEmbarque'])comprobar(w()[f]().length===0,'Filtración local en '+f);
    const denegado=await w().fetch('/api/animales?establecimiento_id='+perfilA.establecimientoId);comprobar(denegado.status===403,'API acepta establecimiento ajeno');
    await navegar('/pages/txt-snig.html');comprobar(w().obtenerListaTxt().length===0 && w().obtenerHistorialTxt().length===0,'TXT compartido');
    await navegar('/pages/importar-txt.html');comprobar(w().obtenerArchivosProcesadosTxt().length===0,'Importaciones compartidas');
  });
  await paso('Regreso de Ana: conserva todos sus módulos',async()=>{
    await login(correoA);comprobar(w().obtenerAnimales().length===3 && w().obtenerPesajes().length===2 && w().obtenerSanidad().length===1 && w().obtenerReproduccion().length===1 && w().obtenerLotesEmbarque().length===1,'Datos no recuperados');
  });
  await paso('PWA: service worker activo y ninguna respuesta API cacheada',async()=>{
    await esperar(()=>w().navigator.serviceWorker.controller);
    const nombres=await w().caches.keys();let api=false;
    for(const nombre of nombres)for(const req of await(await w().caches.open(nombre)).keys())if(new URL(req.url).pathname.startsWith('/api/'))api=true;
    comprobar(!api,'API cacheada');comprobar(nombres.some(n=>n.startsWith('ruraldata-cache-')),'Sin caché PWA');
    const recurso=await w().caches.match('/pages/buscar-animal.html');comprobar(recurso,'No se precargó búsqueda');
  });
  const resumen=document.createElement('p');resumen.textContent=`Finalizado: ${resultados.filter(r=>r.estado==='OK').length}/${resultados.length} comprobaciones. Detené el servidor para la prueba offline completa.`;lista.after(resumen);
};
document.getElementById('offline').onclick=async()=>{
  if(!laboratorioLocal)return;
  const li=document.createElement('li');lista.append(li);
  try{
    await navegar('/pages/buscar-animal.html');
    comprobar(w().navigator.serviceWorker.controller,'Sin controlador SW');comprobar(w().obtenerAnimales().length===3,'Datos offline ausentes');
    llenar('identificacionBusqueda','91000001');enviar('formBuscarAnimal');
    comprobar(w().document.body.textContent.includes('91000001'),'No busca offline');li.textContent='Servidor detenido: recarga y búsqueda mediante SW — OK';
  }catch(error){li.textContent='Servidor detenido — FALLO: '+error.message;}
};
