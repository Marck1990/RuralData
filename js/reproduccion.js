// Manejo de reproducción, gestación y pariciones en RuralData.

document.addEventListener("DOMContentLoaded", () => {
  const formReproduccion = document.getElementById("formReproduccion");

  if (formReproduccion) {
    formReproduccion.addEventListener("submit", registrarReproduccion);
  }

  cargarRegistrosReproduccion();
});

function registrarReproduccion(event) {
  event.preventDefault();

  const identificador = document
    .getElementById("identificadorAnimal")
    .value
    .trim()
    .toLowerCase();

  const animales = obtenerAnimales();

  const animal = animales.find(animal =>
    animal.caravanaVisual.toLowerCase() === identificador ||
    animal.codigoRFID.toLowerCase() === identificador
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
    categoria: animal.categoria,
    estadoReproductivo: document.getElementById("estadoReproductivo").value,
    fechaEstimadaParto: document.getElementById("fechaEstimadaParto").value,
    diasAviso: Number(document.getElementById("diasAviso").value),
    observaciones: document.getElementById("observacionesReproduccion").value.trim(),
    fechaRegistro: new Date().toISOString()
  };

  const registros = obtenerReproduccion();
  registros.push(registro);
  guardarReproduccion(registros);

  alert("Registro reproductivo guardado correctamente.");
  event.target.reset();

  cargarRegistrosReproduccion();
}

function cargarRegistrosReproduccion() {
  const contenedor = document.getElementById("listaReproduccion");

  if (!contenedor) return;

  const registros = obtenerReproduccion();

  if (registros.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info">
        No hay registros reproductivos.
      </div>
    `;
    return;
  }

  contenedor.innerHTML = registros.map(registro => `
    <div class="card shadow-sm">
      <div class="card-body">
        <h2 class="h5 fw-bold">${registro.caravanaVisual || registro.codigoRFID}</h2>
        <p><strong>Estado:</strong> ${registro.estadoReproductivo}</p>
        <p><strong>Categoría:</strong> ${registro.categoria}</p>
        <p><strong>Fecha estimada de parto:</strong> ${registro.fechaEstimadaParto || "Sin dato"}</p>
        <p><strong>Aviso previo:</strong> ${registro.diasAviso} días</p>
        ${generarAlertaParto(registro)}
        <p><strong>Observaciones:</strong> ${registro.observaciones || "Sin observaciones"}</p>
      </div>
    </div>
  `).join("");
}

function generarAlertaParto(registro) {
  if (!registro.fechaEstimadaParto) return "";

  const hoy = new Date();
  const fechaParto = new Date(registro.fechaEstimadaParto);
  const diferenciaMs = fechaParto - hoy;
  const diasRestantes = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

  if (diasRestantes < 0) {
    return `
      <div class="alert alert-danger py-2">
        Fecha estimada de parto vencida.
      </div>
    `;
  }

  if (diasRestantes <= registro.diasAviso) {
    return `
      <div class="alert alert-warning py-2">
        Atención: faltan ${diasRestantes} días para la fecha estimada de parto.
      </div>
    `;
  }

  return `
    <div class="alert alert-success py-2">
      Faltan ${diasRestantes} días para la fecha estimada de parto.
    </div>
  `;
}