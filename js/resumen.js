// Resumen general de RuralData.

document.addEventListener("DOMContentLoaded", () => {
  cargarResumen();
});

function cargarResumen() {
  const animales = obtenerAnimales();
  const sanidad = obtenerSanidad();
  const contenedor = document.getElementById("resumenGeneral");

  const categorias = {};

  animales.forEach(animal => {
    categorias[animal.categoria] = (categorias[animal.categoria] || 0) + 1;
  });

  let categoriasHtml = "";

  for (const categoria in categorias) {
    categoriasHtml += `
      <li class="list-group-item d-flex justify-content-between">
        <span>${categoria}</span>
        <strong>${categorias[categoria]}</strong>
      </li>
    `;
  }

  contenedor.innerHTML = `
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 fw-bold">Totales</h2>
        <p><strong>Animales registrados:</strong> ${animales.length}</p>
        <p><strong>Controles sanitarios:</strong> ${sanidad.length}</p>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 fw-bold">Animales por categoría</h2>
        <ul class="list-group">
          ${categoriasHtml || "<li class='list-group-item'>Sin animales registrados</li>"}
        </ul>
      </div>
    </div>
  `;
}