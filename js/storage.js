// Manejo simple de almacenamiento local para RuralData.
// Ahora los datos productivos se separan por establecimiento.

const STORAGE_KEYS = {
  animales: "ruraldata_animales",
  sanidad: "ruraldata_sanidad",
  usuarios: "ruraldata_usuarios",
  sesion: "ruraldata_sesion",
  reproduccion: "ruraldata_reproduccion"
};

// Obtiene datos desde localStorage.
function obtenerDatos(clave) {
  const datos = localStorage.getItem(clave);
  return datos ? JSON.parse(datos) : [];
}

// Guarda datos en localStorage.
function guardarDatos(clave, datos) {
  localStorage.setItem(clave, JSON.stringify(datos));
}

// Obtiene la sesión activa.
function obtenerSesion() {
  const sesion = localStorage.getItem(STORAGE_KEYS.sesion);
  return sesion ? JSON.parse(sesion) : null;
}

// Guarda la sesión activa.
function guardarSesion(usuario) {
  localStorage.setItem(STORAGE_KEYS.sesion, JSON.stringify(usuario));
}

// Cierra la sesión activa.
function cerrarSesionLocal() {
  localStorage.removeItem(STORAGE_KEYS.sesion);
}

// Devuelve el establecimiento activo.
// Si el usuario todavía no tiene establecimientoId, usa su id como respaldo.
function obtenerEstablecimientoActivo() {
  const sesion = obtenerSesion();

  if (!sesion) {
    return "sin_establecimiento";
  }

  if (sesion.establecimientoId) {
    return sesion.establecimientoId;
  }

  if (sesion.id) {
    return "establecimiento_usuario_" + sesion.id;
  }

  return "sin_establecimiento";
}

// Arma una clave separada para cada establecimiento.
function obtenerClavePorEstablecimiento(claveBase) {
  const establecimientoId = obtenerEstablecimientoActivo();

  return claveBase + "_" + establecimientoId;
}

// Animales separados por establecimiento.
function obtenerAnimales() {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.animales);

  return obtenerDatos(clave);
}

function guardarAnimales(animales) {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.animales);

  guardarDatos(clave, animales);
}

// Sanidad separada por establecimiento.
function obtenerSanidad() {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.sanidad);

  return obtenerDatos(clave);
}

function guardarSanidad(registros) {
  const clave = obtenerClavePorEstablecimiento(STORAGE_KEYS.sanidad);

  guardarDatos(clave, registros);
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

// Usuarios generales del sistema local.
function obtenerUsuarios() {
  return obtenerDatos(STORAGE_KEYS.usuarios);
}

function guardarUsuarios(usuarios) {
  guardarDatos(STORAGE_KEYS.usuarios, usuarios);
}