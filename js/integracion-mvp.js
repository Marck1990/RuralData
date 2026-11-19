import { crearPersistencia } from './persistencia-mvp.js';
import { crearSincronizador } from './sincronizador-mvp.js';
import { espacioProductor } from './identidad-mvp.js';
window.espacioProductorMvp=espacioProductor;

let persistencia,espacio,escritor=false,sincronizador,estadoActual='pendiente';
let cerrarLock, resolverInicio, paginaActiva=true;
const inicio = new Promise(resolve=>{resolverInicio=resolve;});
// La lectura local está disponible al cargar el módulo. El lock solo habilita escrituras.
const perfilInicial=obtenerSesion();
const paginaPublica=document.getElementById('formLogin') || document.getElementById('formRegistroUsuario');
const nombreLock=!paginaPublica && perfilInicial?.autenticacionMvp ? 'ruraldata-mvp-'+espacioProductor(perfilInicial) : null;
const lockListo = navigator.locks && nombreLock ? navigator.locks.request(nombreLock,{ifAvailable:true},async lock=>{
  escritor=!!lock && paginaActiva;
  resolverInicio();
  if(escritor)await new Promise(resolve=>{cerrarLock=resolve;});
}).catch(()=>resolverInicio()) : Promise.resolve().then(()=>resolverInicio());
void lockListo;
window.addEventListener('pagehide',()=>{
  paginaActiva=false;
  escritor=false;
  cerrarLock?.();
});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
window.addEventListener('storage',event=>{
  if(event.key!=='ruraldata_cierre_sesion_v2' || !event.newValue)return;
  const perfil=obtenerSesion(),cerrada=JSON.parse(event.newValue);
  if(perfil?.id===cerrada.id && perfil?.establecimientoId===cerrada.establecimientoId) {
    sessionStorage.setItem('ruraldata_sesion_productor_v2','null');
    location.href=location.pathname.includes('/pages/')?'../login.html':'login.html';
  }
});

function abrir() {
  const perfil=obtenerSesion();
  if(!perfil?.autenticacionMvp)throw new Error('Iniciá sesión una vez para habilitar el almacenamiento offline');
  const id=obtenerEstablecimientoActivo();
  if(!persistencia || espacio!==id) {
    espacio=id;persistencia=crearPersistencia({storage:localStorage,establecimientoId:id});
    // Nunca adoptar automáticamente datos antiguos o de otra cuenta.
    sincronizador=crearSincronizador({persistencia,identidad:{id:perfil.id,establecimientoId:perfil.establecimientoId},
      identidadActual:()=>paginaActiva && escritor ? obtenerSesion() : null,notificar:mostrarEstado});
  }
  return persistencia;
}
function adoptarSanidadHistorica(cache) {
  const guardados=cache.estado().registros;
  const historicos=obtenerSanidadHistorica().filter(registro=>!guardados[JSON.stringify(['sanidad',registro.id])]);
  const ids=new Set(historicos.map(registro=>registro.id));
  if(ids.size!==historicos.length || historicos.some(registro=>!registro.id)) {
    throw new Error('Datos inválidos: hay registros sanitarios históricos sin ID inequívoco');
  }
  if(historicos.length)cache.adoptar('sanidad',historicos);
}
function mostrarEstado(estado) {
  estadoActual=estado;
  const panel=document.getElementById('estadoSincronizacionMvp');if(!panel)return;
  const e=persistencia?.estado();
  const texto={sesion:'Sesión vencida: los datos siguen guardados. Iniciá sesión para sincronizar.',
    deshabilitado:'Sincronización no habilitada en el servidor. Datos guardados en este equipo.',
    offline:'Sin conexión: cambios guardados en este equipo.',conflicto:'Hay conflictos que requieren revisión.',
    pendiente:'Cambios pendientes de sincronizar.',listo:'Datos sincronizados.'};
  panel.querySelector('[data-estado]').textContent=(escritor?'':'Otra pestaña tiene la edición. ')+(texto[estado]||texto.pendiente)+
    (e ? ' Pendientes: '+e.pendientes.length+'.' : '');
  const lista=panel.querySelector('[data-conflictos]');lista.replaceChildren();
  for(const [k,r] of Object.entries(e?.conflictos || {})) {
    const detalle=document.createElement('details');const titulo=document.createElement('summary');
    titulo.textContent='Revisar '+JSON.parse(k)[0]+' / '+r.id;detalle.append(titulo);
    const pre=document.createElement('pre');pre.textContent=JSON.stringify({local:e.registros[k],remoto:r},null,2);detalle.append(pre);
    if(!r.sinVersion)for(const [label,local]of [['Conservar mis cambios',true],['Aceptar remoto',false]]) {
      const btn=document.createElement('button');btn.type='button';btn.className='btn btn-sm btn-outline-secondary';btn.textContent=label;
      btn.onclick=()=>{if(escritor && confirm('¿'+label+' para este registro?')){persistencia.resolver(k,local);if(JSON.parse(k)[0]==='sanidad')sincronizador.invalidarSanidad();notificarDatos();mostrarEstado('pendiente');}};
      detalle.append(btn);
    }
    lista.append(detalle);
  }
}
function notificarDatos() {
  document.dispatchEvent(new Event('ruraldata:datos'));
}
window.RuralDataMvp={
  listo:inicio,
  get escritor(){return escritor;},
  get sanidadVerificada(){
    return paginaActiva && navigator.onLine!==false && obtenerSesion()?.autenticacionMvp &&
      sincronizador?.sanidadVerificada?.()===true;
  },
  listar(entidad){
    const cache=abrir();
    const registros=cache.listar(entidad);
    if(entidad!=='sanidad')return registros;
    const guardados=cache.estado().registros;
    return [...registros,...obtenerSanidadHistorica().filter(registro=>!guardados[JSON.stringify(['sanidad',registro.id])])];
  },
  guardar(entidad,registros){
    if(!escritor)throw new Error('Edición bloqueada: usá una sola pestaña con Web Locks disponible');
    const cache=abrir();
    if(entidad==='sanidad')adoptarSanidadHistorica(cache);
    cache.guardarColeccion(entidad,registros);notificarDatos();mostrarEstado('pendiente');
  },
  async sincronizar(){
    await inicio;
    if(!escritor)return;
    try{
      const cache=abrir();
      adoptarSanidadHistorica(cache);
      const actual=sincronizador;
      const proceso=actual.sincronizar();
      notificarDatos();
      await proceso;
    }catch{sincronizador?.invalidarSanidad?.();mostrarEstado('deshabilitado');}
    finally{notificarDatos();}
  }
};
document.dispatchEvent(new Event('ruraldata:lista'));
document.addEventListener('DOMContentLoaded',()=>{
  if(paginaPublica || !obtenerSesion()?.autenticacionMvp)return;
  const panel=document.createElement('aside');panel.id='estadoSincronizacionMvp';panel.className='alert alert-light m-2';
  const estado=document.createElement('span');estado.dataset.estado='';panel.append(estado);
  const boton=document.createElement('button');boton.type='button';boton.className='btn btn-sm btn-outline-success ms-2';boton.textContent='Sincronizar';
  boton.onclick=()=>window.RuralDataMvp.sincronizar();panel.append(boton);
  const login=document.createElement('a');login.href=location.pathname.includes('/pages/')?'../login.html':'login.html';login.textContent=' Iniciar sesión';panel.append(login);
  const conflictos=document.createElement('div');conflictos.dataset.conflictos='';panel.append(conflictos);
  document.body.append(panel);mostrarEstado(estadoActual);
  void inicio.then(()=>{
    if(!paginaActiva)return;
    mostrarEstado(estadoActual);
    return window.RuralDataMvp.sincronizar();
  });
  // Solo pide API autenticada; todos los fallos conservan la cola.
  setInterval(()=>window.RuralDataMvp.sincronizar(),60000);
  let sanidadVerificada=window.RuralDataMvp.sanidadVerificada;
  setInterval(()=>{
    const vigente=window.RuralDataMvp.sanidadVerificada;
    if(vigente!==sanidadVerificada){sanidadVerificada=vigente;notificarDatos();}
  },5000);
});
window.addEventListener('online',()=>window.RuralDataMvp.sincronizar());
window.addEventListener('offline',()=>{sincronizador?.invalidarSanidad?.();notificarDatos();});
// Errores de cuota/JSON/edición se informan sin afirmar que hubo guardado.
window.addEventListener('error',event=>{
  if(/Quota|JSON|Edición bloqueada|Datos inválidos|almacenamiento offline/.test(event.message))alert('No se pudo guardar: '+event.message);
});
window.addEventListener('unhandledrejection',event=>{
  const mensaje=event.reason?.message || '';
  if(/Quota|JSON|Edición bloqueada|Datos inválidos|almacenamiento offline/.test(mensaje))alert('No se pudo guardar: '+mensaje);
});
