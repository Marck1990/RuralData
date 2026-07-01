// Manejo simple de almacenamiento local para RuralData.

const STORAGE_KEYS = {
  animales: "ruraldata_animales",
  sanidad: "ruraldata_sanidad"
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