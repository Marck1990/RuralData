import { crearPersistencia } from './persistencia-mvp.js';
import { crearSincronizador } from './sincronizador-mvp.js';
import { espacioProductor } from './identidad-mvp.js';
window.espacioProductorMvp=espacioProductor;

let persistencia,espacio,escritor=false,sincronizador,estadoActual='pendiente';
let cerrarLock, resolverInicio;
const inicio = new Promise(resolve=>{resolverInicio=resolve;});
// Un escritor por cuenta/establecimiento; otra cuenta tiene un lock distinto.
const perfilInicial=obtenerSesion();
const nombreLock=perfilInicial?.autenticacionMvp ? 'ruraldata-mvp-'+espacioProductor(perfilInicial) : null;
const lockListo = navigator.locks && nombreLock ? navigator.locks.request(nombreLock,{ifAvailable:true},async lock=>{
  escritor=!!lock;
  resolverInicio();
  if(lock)await new Promise(resolve=>{cerrarLock=resolve;});
}).catch(()=>resolverInicio()) : Promise.resolve().then(()=>resolverInicio());
void lockListo;
await inicio;
window.addEventListener('pagehide',()=>cerrarLock?.());
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
      identidadActual:obtenerSesion,notificar:mostrarEstado});
  }
  return persistencia;
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
      btn.onclick=()=>{if(escritor && confirm('¿'+label+' para este registro?')){persistencia.resolver(k,local);mostrarEstado('pendiente');}};
      detalle.append(btn);
    }
    lista.append(detalle);
  }
}
window.RuralDataMvp={
  get escritor(){return escritor;},
  listar(entidad){return abrir().listar(entidad);},
  guardar(entidad,registros){
    if(!escritor)throw new Error('Edición bloqueada: usá una sola pestaña con Web Locks disponible');
    abrir().guardarColeccion(entidad,registros);mostrarEstado('pendiente');
  },
  async sincronizar(){
    if(!escritor)return;
    try{abrir();await sincronizador.sincronizar();}catch{mostrarEstado('deshabilitado');}
  }
};
document.addEventListener('DOMContentLoaded',()=>{
  if(document.getElementById('formLogin') || document.getElementById('formRegistroUsuario') || !obtenerSesion()?.autenticacionMvp)return;
  const panel=document.createElement('aside');panel.id='estadoSincronizacionMvp';panel.className='alert alert-light m-2';
  const estado=document.createElement('span');estado.dataset.estado='';panel.append(estado);
  const boton=document.createElement('button');boton.type='button';boton.className='btn btn-sm btn-outline-success ms-2';boton.textContent='Sincronizar';
  boton.onclick=()=>window.RuralDataMvp.sincronizar();panel.append(boton);
  const login=document.createElement('a');login.href=location.pathname.includes('/pages/')?'../login.html':'login.html';login.textContent=' Iniciar sesión';panel.append(login);
  const conflictos=document.createElement('div');conflictos.dataset.conflictos='';panel.append(conflictos);
  document.body.append(panel);mostrarEstado(estadoActual);
  window.RuralDataMvp.sincronizar();
  // Solo pide API autenticada; todos los fallos conservan la cola.
  setInterval(()=>window.RuralDataMvp.sincronizar(),60000);
});
window.addEventListener('online',()=>window.RuralDataMvp.sincronizar());
// Errores de cuota/JSON/edición se informan sin afirmar que hubo guardado.
window.addEventListener('error',event=>{
  if(/Quota|JSON|Edición bloqueada|Datos inválidos|almacenamiento offline/.test(event.message))alert('No se pudo guardar: '+event.message);
});
window.addEventListener('unhandledrejection',event=>{
  const mensaje=event.reason?.message || '';
  if(/Quota|JSON|Edición bloqueada|Datos inválidos|almacenamiento offline/.test(mensaje))alert('No se pudo guardar: '+mensaje);
});
