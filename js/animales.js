// Manejo de animales en RuralData.

document.addEventListener("DOMContentLoaded", () => {
  const formAnimal = document.getElementById("formAnimal");

  if (formAnimal) {
    formAnimal.addEventListener("submit", registrarAnimal);
  }
});

function registrarAnimal(event) {
  event.preventDefault();

  const identificacion = crearIdentificacion(
    document.getElementById("caravanaVisual").value,
    document.getElementById("codigoRFID").value
  );

  if (!identificacionEsValida(identificacion)) {
    alert("Debe ingresar caravana visual o código RFID.");
    return;
  }

  const animal = {
    id: crypto.randomUUID(),
    caravanaVisual: identificacion.caravanaVisual,
    codigoRFID: identificacion.codigoRFID,
    metodoIngreso: identificacion.metodoIngreso,
    propietario: document.getElementById("propietario").value.trim(),
    campo: document.getElementById("campo").value.trim(),
    categoria: document.getElementById("categoria").value,
    sexo: document.getElementById("sexo").value,
    raza: document.getElementById("raza").value.trim(),
    estado: document.getElementById("estado").value,
    observaciones: document.getElementById("observaciones").value.trim()
  };

  const animales = obtenerAnimales();
  animales.push(animal);
  guardarAnimales(animales);

  alert("Animal registrado correctamente.");
  formAnimal.reset();
}





const btnBuscarAnimal = document.getElementById("btnBuscarAnimal");

if (btnBuscarAnimal) {
  btnBuscarAnimal.addEventListener("click", buscarAnimal);
}

function buscarAnimal() {
  const valorBusqueda = document
    .getElementById("busquedaAnimal")
    .value
    .trim()
    .toLowerCase();

  const resultado = document.getElementById("resultadoBusqueda");

  if (valorBusqueda === "") {
    resultado.innerHTML = `
      <div class="alert alert-warning">
        Ingrese una caravana o RFID.
      </div>
    `;
    return;
  }

  const animales = obtenerAnimales();

  const animal = animales.find(a =>
    a.caravanaVisual.toLowerCase() === valorBusqueda ||
    a.codigoRFID.toLowerCase() === valorBusqueda
  );

  if (!animal) {
    resultado.innerHTML = `
      <div class="alert alert-danger">
        No se encontró ningún animal.
      </div>
    `;
    return;
  }

  resultado.innerHTML = `
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 fw-bold">${animal.caravanaVisual || animal.codigoRFID}</h2>
        <p><strong>Propietario:</strong> ${animal.propietario}</p>
        <p><strong>Campo:</strong> ${animal.campo}</p>
        <p><strong>Categoría:</strong> ${animal.categoria}</p>
        <p><strong>Sexo:</strong> ${animal.sexo}</p>
        <p><strong>Raza:</strong> ${animal.raza || "Sin dato"}</p>
        <p><strong>Estado:</strong> ${animal.estado}</p>
        <p><strong>RFID:</strong> ${animal.codigoRFID || "Sin dato"}</p>
        <p><strong>Observaciones:</strong> ${animal.observaciones || "Sin observaciones"}</p>
      </div>
    </div>
  `;
}