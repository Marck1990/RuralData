import { mismaIdentidad } from './identidad-mvp.js';
const entidades = ['animales','pesajes','sanidad'];
export function crearSincronizador({persistencia,identidad,identidadActual=()=>identidad,fetcher=fetch,notificar=()=>{},ahora=Date.now}) {
  let activo,verificadaHasta=0;
  async function pedir(url,opciones={}) {
    if(!mismaIdentidad(identidad,identidadActual()))throw new Error('La cuenta local cambió');
    const response=await fetcher(url,{...opciones,headers:{...opciones.headers,
      'X-RuralData-Usuario':identidad.id,'X-RuralData-Establecimiento':identidad.establecimientoId},
      credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!mismaIdentidad(identidad,identidadActual()))throw new Error('La cuenta local cambió');
    let datos;try{datos=await response.json();}catch{throw new Error('Respuesta inválida; se conserva la cola');}
    if(!mismaIdentidad(identidad,identidadActual()))throw new Error('La cuenta local cambió');
    return {response,datos};
  }
  async function ejecutar() {
    verificadaHasta=0;
    try {
      const sesion=await pedir('/api/sesion');
      if(!sesion.response.ok){notificar([401,403].includes(sesion.response.status)?'sesion':'deshabilitado');return;}
      if(!mismaIdentidad(identidad,sesion.datos.perfil)){notificar('sesion');return;}
      // Las altas de animales preceden a sus pesajes y tratamientos.
      for(const entidad of entidades) {
        while(true) {
          const e=persistencia.estado();
          const op=e.pendientes.find(p=>p.entidad===entidad && !p.dependeDe && !e.conflictos[p.clave] &&
            (entidad==='animales' || !e.pendientes.some(a=>a.entidad==='animales' && a.registroId===p.registro.animalId)));
          if(!op)break;
          const {response,datos}=await pedir('/api/'+entidad,{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({operacionId:op.id,versionBase:op.versionBase,registro:op.registro})});
          if(response.status===401 || response.status===403){notificar('sesion');return;}
          if(response.status===409){persistencia.conflicto(op.id,datos.registro,datos.error);continue;}
          if(!response.ok || !datos.ok)throw new Error(datos.error || 'No se pudo sincronizar');
          persistencia.confirmar(op.id,datos.registro);
        }
      }
      for(const entidad of entidades) {
        const inicioLectura=ahora();
        const {response,datos}=await pedir('/api/'+entidad);
        if(!response.ok || !datos.ok || !Array.isArray(datos[entidad])) {
          notificar(response.status===401?'sesion':'deshabilitado');return;
        }
        for(const registro of datos[entidad])persistencia.recibir(entidad,registro);
        if(entidad==='sanidad')verificadaHasta=inicioLectura+60000;
      }
      const estado=persistencia.estado();
      notificar(Object.keys(estado.conflictos).length?'conflicto':estado.pendientes.length?'pendiente':'listo');
    }catch{verificadaHasta=0;notificar('offline');}
  }
  return {
    invalidarSanidad(){verificadaHasta=0;},
    sanidadVerificada(){
      if(activo || ahora()>=verificadaHasta || !mismaIdentidad(identidad,identidadActual()))return false;
      const e=persistencia.estado();
      return !e.pendientes.some(op=>op.entidad==='sanidad') &&
        !Object.keys(e.conflictos).some(clave=>JSON.parse(clave)[0]==='sanidad');
    },
    sincronizar(){if(!activo)activo=ejecutar().finally(()=>{activo=null;});return activo;}
  };
}
