import { mismaIdentidad } from './identidad-mvp.js';
export function crearSincronizador({persistencia,identidad,identidadActual=()=>identidad,fetcher=fetch,notificar=()=>{}}) {
  let activo;
  async function pedir(url,opciones={}) {
    if(!mismaIdentidad(identidad,identidadActual()))throw new Error('La cuenta local cambió');
    const response=await fetcher(url,{...opciones,headers:{...opciones.headers,
      'X-RuralData-Usuario':identidad.id,'X-RuralData-Establecimiento':identidad.establecimientoId},
      credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!mismaIdentidad(identidad,identidadActual()))throw new Error('La cuenta local cambió');
    let datos;try{datos=await response.json();}catch{throw new Error('Respuesta inválida; se conserva la cola');}
    return {response,datos};
  }
  async function ejecutar() {
    try {
      const sesion=await pedir('/api/sesion');
      if(!sesion.response.ok){notificar([401,403].includes(sesion.response.status)?'sesion':'deshabilitado');return;}
      if(!mismaIdentidad(identidad,sesion.datos.perfil)){notificar('sesion');return;}
      // Las altas de animales preceden a todos los pesajes.
      for(const entidad of ['animales','pesajes']) {
        while(true) {
          const e=persistencia.estado();
          const op=e.pendientes.find(p=>p.entidad===entidad && !p.dependeDe && !e.conflictos[p.clave] &&
            (entidad!=='pesajes' || !e.pendientes.some(a=>a.entidad==='animales' && a.registroId===p.registro.animalId)));
          if(!op)break;
          const {response,datos}=await pedir('/api/'+entidad,{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({operacionId:op.id,versionBase:op.versionBase,registro:op.registro})});
          if(response.status===401 || response.status===403){notificar('sesion');return;}
          if(response.status===409){persistencia.conflicto(op.id,datos.registro,datos.error);continue;}
          if(!response.ok || !datos.ok)throw new Error(datos.error || 'No se pudo sincronizar');
          persistencia.confirmar(op.id,datos.registro);
        }
      }
      for(const entidad of ['animales','pesajes']) {
        const {response,datos}=await pedir('/api/'+entidad);
        if(!response.ok || !datos.ok || !Array.isArray(datos[entidad])) {
          notificar(response.status===401?'sesion':'deshabilitado');return;
        }
        for(const registro of datos[entidad])persistencia.recibir(entidad,registro);
      }
      const estado=persistencia.estado();
      notificar(Object.keys(estado.conflictos).length?'conflicto':estado.pendientes.length?'pendiente':'listo');
    }catch{notificar('offline');}
  }
  return {sincronizar(){if(!activo)activo=ejecutar().finally(()=>{activo=null;});return activo;}};
}
