// Manejo simple de almacenamiento local para RuralData.

const STORAGE_KEYS = {
  animales: "ruraldata_animales",
  sanidad: "ruraldata_sanidad",
  usuarios: "ruraldata_usuarios",
  sesion: "ruraldata_sesion",
  reproduccion: "ruraldata_reproduccion"
};

function obtenerDatos(clave) {
  const datos = localStorage.getItem(clave);
  return datos ? JSON.parse(datos) : [];
}

function guardarDatos(clave, datos) {
  localStorage.setItem(clave, JSON.stringify(datos));
}

function obtenerAnimales() {
  return obtenerDatos(STORAGE_KEYS.animales);
}

function guardarAnimales(animales) {
  guardarDatos(STORAGE_KEYS.animales, animales);
}

function obtenerSanidad() {
  return obtenerDatos(STORAGE_KEYS.sanidad);
}

function guardarSanidad(registros) {
  guardarDatos(STORAGE_KEYS.sanidad, registros);
}

function obtenerUsuarios() {
  return obtenerDatos(STORAGE_KEYS.usuarios);
}

function guardarUsuarios(usuarios) {
  guardarDatos(STORAGE_KEYS.usuarios, usuarios);
}

function obtenerSesion() {
  const sesion = localStorage.getItem(STORAGE_KEYS.sesion);
  return sesion ? JSON.parse(sesion) : null;
}

function guardarSesion(usuario) {
  localStorage.setItem(STORAGE_KEYS.sesion, JSON.stringify(usuario));
}

function cerrarSesionLocal() {
  localStorage.removeItem(STORAGE_KEYS.sesion);
}

function obtenerReproduccion() {
  return obtenerDatos(STORAGE_KEYS.reproduccion);
}

function guardarReproduccion(registros) {
  guardarDatos(STORAGE_KEYS.reproduccion, registros);
}