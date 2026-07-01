// Listados generales de animales y controles sanitarios.

document.addEventListener("DOMContentLoaded", () => {
  cargarAnimales();
  cargarControles();
});

function cargarAnimales() {
  const contenedor = document.getElementById("listaAnimales");

  if (!contenedor) return;

  const animales = obtenerAnimales();

  if (animales.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info">
        No hay animales registrados.
      </div>
    `;
    return;
  }

  contenedor.innerHTML = animales.map(animal => `
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 fw-bold">${animal.caravanaVisual || animal.codigoRFID}</h2>
        <p><strong>Propietario:</strong> ${animal.propietario}</p>
        <p><strong>Campo:</strong> ${animal.campo}</p>
        <p><strong>Categoría:</strong> ${animal.categoria}</p>
        <p><strong>Sexo:</strong> ${animal.sexo}</p>
        <p><strong>RFID:</strong> ${animal.codigoRFID || "Sin dato"}</p>
      </div>
    </div>
  `).join("");
}

function cargarControles() {
  const contenedor = document.getElementById("listaControles");

  if (!contenedor) return;

  const controles = obtenerSanidad();

  if (controles.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info">
        No hay controles sanitarios registrados.
      </div>
    `;
    return;
  }

  contenedor.innerHTML = controles.map(control => `
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 fw-bold">${control.tipoControl}</h2>
        <p><strong>Animal:</strong> ${control.caravanaVisual || control.codigoRFID}</p>
        <p><strong>Producto:</strong> ${control.producto}</p>
        <p><strong>Aplicación:</strong> ${control.fechaAplicacion}</p>
        <p><strong>Próxima fecha:</strong> ${control.fechaProxima || "Sin dato"}</p>
        <p><strong>Observaciones:</strong> ${control.observaciones || "Sin observaciones"}</p>
      </div>
    </div>
  `).join("");
}