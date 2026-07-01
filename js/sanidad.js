// Manejo de registros sanitarios en RuralData.

document.addEventListener("DOMContentLoaded", () => {
  const formSanidad = document.getElementById("formSanidad");

  if (formSanidad) {
    formSanidad.addEventListener("submit", registrarSanidad);
  }
});

function registrarSanidad(event) {
  event.preventDefault();

  const identificador = document
    .getElementById("identificadorAnimal")
    .value
    .trim()
    .toLowerCase();

  const animales = obtenerAnimales();

  const animal = animales.find(a =>
    a.caravanaVisual.toLowerCase() === identificador ||
    a.codigoRFID.toLowerCase() === identificador
  );

  if (!animal) {
    alert("No existe un animal con esa caravana o RFID.");
    return;
  }

  const registro = {
    id: crypto.randomUUID(),
    animalId: animal.id,
    caravanaVisual: animal.caravanaVisual,
    codigoRFID: animal.codigoRFID,
    tipoControl: document.getElementById("tipoControl").value,
    producto: document.getElementById("producto").value.trim(),
    fechaAplicacion: document.getElementById("fechaAplicacion").value,
    fechaProxima: document.getElementById("fechaProxima").value,
    observaciones: document.getElementById("observacionesSanidad").value.trim()
  };

  const registros = obtenerSanidad();
  registros.push(registro);
  guardarSanidad(registros);

  alert("Control sanitario registrado correctamente.");
  event.target.reset();
}