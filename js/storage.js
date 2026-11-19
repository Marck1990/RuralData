// Manejo simple de almacenamiento local para RuralData.
// Los datos productivos se separan por establecimiento.

const STORAGE_KEYS = {
  animales: "ruraldata_animales",
  sanidad: "ruraldata_sanidad",
  usuarios: "ruraldata_usuarios",
  sesion: "ruraldata_sesion_productor_v2",
  reproduccion: "ruraldata_reproduccion",
  pesajes: "ruraldata_pesajes",
  lotesEmbarque: "ruraldata_lotes_embarque",
  animalesLotesEmbarque: "ruraldata_animales_lotes_embarque"
};

// Obtiene datos desde localStorage.
function obtenerDatos(clave) {
  const datos = localStorage.getItem(clave);

  return datos ? JSON.parse(datos) : [];
}

// Guarda datos en localStorage.
function guardarDatos(clave, datos) {
  asegurarEscrituraLocalMvp();
  localStorage.setItem(clave, JSON.stringify(datos));
}

// Los módulos originales que aún usan localStorage respetan el mismo lock.
function asegurarEscrituraLocalMvp() {
  if (typeof window !== 'undefined' && window.RuralDataMvp?.escritor === false) {
    throw new Error('Edición bloqueada: otra pestaña tiene la edición de esta cuenta');
  }
}

function escaparTextoMvp(valor) {
  return String(valor ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// JSON aporta el literal JavaScript; el escape exterior protege el atributo HTML.
function argumentoEventoMvp(valor) {
  return escaparTextoMvp(JSON.stringify(String(valor ?? '')));
}

// Obtiene la sesión activa.
function obtenerSesion() {
  const sesion = sessionStorage.getItem(STORAGE_KEYS.sesion);
  if (sesion !== null) return JSON.parse(sesion);
  // Reabrir offline conserva solo la última cuenta confirmada en este navegador.
  // Al copiarla a sessionStorage, otra pestaña que inicia sesión no la sustituye.
  const anterior = localStorage.getItem('ruraldata_contexto_offline_v2');
  if (!anterior) return null;
  const perfil = JSON.parse(anterior);
  if (!perfil?.autenticacionMvp || !perfil.id || !perfil.establecimientoId) return null;
  sessionStorage.setItem(STORAGE_KEYS.sesion, JSON.stringify(perfil));
  return perfil;
}

// Guarda la sesión activa.
function guardarSesion(usuario) {
  localStorage.setItem('ruraldata_contexto_offline_v2', JSON.stringify(usuario));
  sessionStorage.setItem(STORAGE_KEYS.sesion, JSON.stringify(usuario));
}

// Cierra la sesión activa.
function cerrarSesionLocal() {
  const actual = obtenerSesion();
  const ultimo = JSON.parse(localStorage.getItem('ruraldata_contexto_offline_v2') || 'null');
  if (actual?.id === ultimo?.id && actual?.establecimientoId === ultimo?.establecimientoId) {
    localStorage.removeItem('ruraldata_contexto_offline_v2');
  }
  // Un null explícito evita que esta pestaña adopte otra cuenta al salir.
  sessionStorage.setItem(STORAGE_KEYS.sesion, 'null');
  if (actual) localStorage.setItem('ruraldata_cierre_sesion_v2', JSON.stringify({
    id:actual.id,establecimientoId:actual.establecimientoId,fecha:Date.now()
  }));
}

// Espacio local de la cuenta y establecimiento, sin alias elegidos por cliente.
function obtenerEstablecimientoActivo() {
  const sesion = obtenerSesion();

  if (!sesion?.autenticacionMvp || !sesion.id || !sesion.establecimientoId) {
    throw new Error('Iniciá sesión para acceder al establecimiento');
  }
  return 'productor_'+encodeURIComponent(sesion.id)+'_establecimiento_'+encodeURIComponent(sesion.establecimientoId);
}

// Arma una clave separada para cada establecimiento.
function obtenerClavePorEstablecimiento(claveBase) {
  const establecimientoId = obtenerEstablecimientoActivo();

  return claveBase + "_" + establecimientoId;
}

// Animales separados por establecimiento.
function obtenerAnimales() {
  if (obtenerSesion()?.autenticacionMvp) return window.RuralDataMvp.listar('animales');
  return obtenerDatos(obtenerClavePorEstablecimiento(STORAGE_KEYS.animales));
}

function guardarAnimales(animales) {
  if (!obtenerSesion()?.autenticacionMvp) throw new Error('Iniciá sesión para habilitar el almacenamiento offline');
  const caravanas=new Set(),rfids=new Set();
  for (const animal of animales) {
    const caravana=String(animal.caravanaVisual || '').trim().toLowerCase();
    const rfid=String(animal.codigoRFID || '').trim().toLowerCase();
    if (('caravanaVisual' in animal || 'codigoRFID' in animal) && !caravana && !rfid) {
      throw new Error('Datos inválidos: el animal debe conservar caravana o RFID');
    }
    if ((caravana && caravanas.has(caravana)) || (rfid && rfids.has(rfid))) {
      throw new Error('Datos inválidos: ya existe un animal con esa caravana o RFID');
    }
    if(caravana)caravanas.add(caravana);if(rfid)rfids.add(rfid);
  }
  window.RuralDataMvp.guardar('animales', animales);
}

// Sanidad separada por establecimiento.
function obtenerSanidad() {
  if (!obtenerSesion()?.autenticacionMvp) throw new Error('Iniciá sesión para acceder a Sanidad');
  if (window.RuralDataMvp) return window.RuralDataMvp.listar('sanidad');
  return obtenerSanidadHistorica();
}

function obtenerSanidadHistorica() {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.sanidad);

  return obtenerDatos(clave);
}

function guardarSanidad(registros) {
  window.RuralDataMvp.guardar('sanidad', registros);
}

// Reproducción separada por establecimiento.
function obtenerReproduccion() {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.reproduccion);

  return obtenerDatos(clave);
}

function guardarReproduccion(registros) {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.reproduccion);

  guardarDatos(clave, registros);
}

// Pesajes separados por establecimiento.
function obtenerPesajes() {
  if (obtenerSesion()?.autenticacionMvp) return window.RuralDataMvp.listar('pesajes');
  return obtenerDatos(obtenerClavePorEstablecimiento(STORAGE_KEYS.pesajes));
}

function guardarPesajes(pesajes) {
  if (!obtenerSesion()?.autenticacionMvp) throw new Error('Iniciá sesión para habilitar el almacenamiento offline');
  const propios=new Set(obtenerAnimales().map(a=>a.id));
  for (const pesaje of pesajes) {
    if ('animalId' in pesaje && !propios.has(pesaje.animalId)) throw new Error('Datos inválidos: el pesaje requiere un animal de este establecimiento');
    if ('pesoKg' in pesaje && (!Number.isFinite(Number(pesaje.pesoKg)) || Number(pesaje.pesoKg)<=0)) throw new Error('Datos inválidos: peso no válido');
  }
  window.RuralDataMvp.guardar('pesajes', pesajes);
}

// Lotes de embarque separados por establecimiento.
function obtenerLotesEmbarque() {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.lotesEmbarque);

  return obtenerDatos(clave);
}

function guardarLotesEmbarque(lotes) {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.lotesEmbarque);

  guardarDatos(clave, lotes);
}

// Animales asignados a lotes de embarque separados por establecimiento.
function obtenerAnimalesLotesEmbarque() {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.animalesLotesEmbarque);

  return obtenerDatos(clave);
}

function guardarAnimalesLotesEmbarque(animalesLotes) {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.animalesLotesEmbarque);

  guardarDatos(clave, animalesLotes);
}

// Usuarios generales del sistema local.
function obtenerUsuarios() {
  return obtenerDatos(STORAGE_KEYS.usuarios);
}

function guardarUsuarios(usuarios) {
  guardarDatos(STORAGE_KEYS.usuarios, usuarios);
}

const MOTIVO_IDENTIDAD_SANITARIA = "Identificación ambigua o contradictoria. Verificá el ID, RFID y la caravana.";
const MOTIVO_CARENCIA_INCOMPLETA = "Datos sanitarios incompletos. Verificá la fecha de liberación.";
const MOTIVO_SANIDAD_NO_VERIFICADA = "Aptitud no verificable. Sincronizá Sanidad y revisá los cambios o conflictos pendientes.";

function normalizarIdentificadorSanitario(valor) {
  return String(valor ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function buscarCoincidenciasIdentificacionSanitaria(identificacion, animales, buscarPorSufijo) {
  const clave = normalizarIdentificadorSanitario(identificacion);
  if (!clave) return [];
  const exactas = animales.filter(animal =>
    [animal.codigoRFID, animal.caravanaVisual].some(valor => normalizarIdentificadorSanitario(valor) === clave)
  );
  if (!buscarPorSufijo || (exactas.length && clave.length !== 8)) return exactas;
  return [...new Set([...exactas, ...animales.filter(buscarPorSufijo)])];
}

function resolverAsociacionSanitaria(registro, animales) {
  const tieneId = registro.animalId != null && registro.animalId !== "";
  const porId = tieneId ? animales.filter(animal => animal.id === registro.animalId) : [];
  const rfid = normalizarIdentificadorSanitario(registro.codigoRFID);
  const caravana = normalizarIdentificadorSanitario(registro.caravanaVisual);
  const porRfid = rfid ? animales.filter(animal => normalizarIdentificadorSanitario(animal.codigoRFID) === rfid) : [];
  const porCaravana = caravana ? animales.filter(animal => normalizarIdentificadorSanitario(animal.caravanaVisual) === caravana) : [];
  const porLectura = buscarCoincidenciasIdentificacionSanitaria(registro.identificacion, animales);

  const grupos = [porId, porRfid, porCaravana, porLectura];
  const candidatos = [...new Set(grupos.flat())];
  const lecturaRfid = porLectura.length === 1 &&
    normalizarIdentificadorSanitario(porLectura[0].codigoRFID) === normalizarIdentificadorSanitario(registro.identificacion);
  let principal = porLectura;
  if (tieneId) principal = porId;
  else if (rfid) principal = porRfid;
  else if (caravana && !lecturaRfid) principal = porCaravana;
  const animal = principal.length === 1 ? principal[0] : null;
  const compatible = animal && grupos.every(grupo => !grupo.length || grupo.includes(animal)) &&
    (tieneId || !caravana || porCaravana.includes(animal));
  return { animal: compatible ? animal : null, candidatos };
}

// Evalúa solo los datos del productor y establecimiento activos.
function obtenerBloqueosSanitariosMvp(animales = obtenerAnimales(), verificarRemoto = true) {
  const bloqueos = Object.create(null);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fechaValida = valor => {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
    const [a,m,d] = valor.split('-').map(Number);
    const fecha = new Date(a,m-1,d);
    return fecha.getFullYear()===a && fecha.getMonth()===m-1 && fecha.getDate()===d ? fecha : null;
  };
  const cantidadesPorId = new Map();
  for (const animal of animales) {
    cantidadesPorId.set(animal.id, (cantidadesPorId.get(animal.id) || 0) + 1);
  }
  for (const animal of animales) {
    if (!animal.id || cantidadesPorId.get(animal.id) !== 1) {
      bloqueos[animal.id] = { motivoPreventivo: MOTIVO_IDENTIDAD_SANITARIA };
    }
  }

  for (const registro of obtenerSanidad()) {
    const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia)>0 || Boolean(registro.fechaLiberacion);
    const fecha = fechaValida(registro.fechaLiberacion);
    const incompleto = (tieneCarencia && !fecha) ||
      (registro.tieneCarencia !== false && !tieneCarencia);
    if (!incompleto && (!tieneCarencia || fecha<=hoy)) continue;
    const { animal, candidatos } = resolverAsociacionSanitaria(registro, animales);
    if (!animal) {
      // Sin candidatos no se puede acotar el bloqueo a un subconjunto del rodeo.
      for (const candidato of candidatos.length ? candidatos : animales) {
        bloqueos[candidato.id] = { motivoPreventivo: MOTIVO_IDENTIDAD_SANITARIA };
      }
      continue;
    }
    const anterior = bloqueos[animal.id];
    if (!anterior || (!anterior.motivoPreventivo && (incompleto || registro.fechaLiberacion > anterior.fechaLiberacion))) {
      bloqueos[animal.id] = incompleto
        ? { datosIncompletos: true, motivoPreventivo: MOTIVO_CARENCIA_INCOMPLETA }
        : registro;
    }
  }
  if (verificarRemoto && window.RuralDataMvp?.sanidadVerificada !== true) {
    for (const animal of animales) {
      bloqueos[animal.id] ??= { motivoPreventivo: MOTIVO_SANIDAD_NO_VERIFICADA, aptitudNoVerificable: true };
    }
  }
  return bloqueos;
}
