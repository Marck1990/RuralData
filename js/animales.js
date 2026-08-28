// Manejo de animales en RuralData.

document.addEventListener("DOMContentLoaded", function () {
  const formAnimal = document.getElementById("formAnimal");
  const categoria = document.getElementById("categoria");

  if (formAnimal) {
    formAnimal.addEventListener("submit", registrarAnimal);
  }

  if (categoria) {
    categoria.addEventListener("change", mostrarSexoAutomatico);
  }

  const btnBuscarAnimal = document.getElementById("btnBuscarAnimal");

  if (btnBuscarAnimal) {
    btnBuscarAnimal.addEventListener("click", buscarAnimal);
  }
});

function registrarAnimal(event) {
  event.preventDefault();

  const formAnimal = document.getElementById("formAnimal");
  const mensaje = document.getElementById("mensajeRegistroAnimal");

  const caravanaVisual = document.getElementById("caravanaVisual").value.trim();
  const codigoRFID = document.getElementById("codigoRFID").value.trim();
  const propietario = document.getElementById("propietario").value.trim();
  const campo = document.getElementById("campo").value.trim();
  const categoria = document.getElementById("categoria").value;
  const raza = document.getElementById("raza").value.trim();
  const estado = document.getElementById("estado").value;
  const observaciones = document.getElementById("observaciones").value.trim();

  const identificacion = crearIdentificacionAnimal(
    caravanaVisual,
    codigoRFID
  );

  if (!identificacionAnimalEsValida(identificacion)) {
    mostrarMensajeRegistroAnimal(
      "Debe ingresar caravana visual o código RFID.",
      "warning"
    );
    return;
  }

  if (categoria === "") {
    mostrarMensajeRegistroAnimal(
      "Debe seleccionar una categoría.",
      "warning"
    );
    return;
  }

  const sexoAutomatico = determinarSexoPorCategoria(categoria);

  const animales = obtenerAnimales();

  const existeAnimal = existeAnimalRegistrado(
    animales,
    identificacion.caravanaVisual,
    identificacion.codigoRFID
  );

  if (existeAnimal) {
    mostrarMensajeRegistroAnimal(
      "Ya existe un animal registrado con esa caravana o RFID.",
      "danger"
    );
    return;
  }

  const animal = {
    id: crypto.randomUUID(),
    caravanaVisual: identificacion.caravanaVisual,
    codigoRFID: identificacion.codigoRFID,
    metodoIngreso: identificacion.metodoIngreso,
    propietario: propietario,
    campo: campo,
    categoria: categoria,
    sexo: sexoAutomatico,
    raza: raza,
    estado: estado,
    observaciones: observaciones,
    fechaRegistro: new Date().toISOString()
  };

  animales.push(animal);
  guardarAnimales(animales);

  mostrarMensajeRegistroAnimal(
    "Animal registrado correctamente. Sexo asignado: " + sexoAutomatico + ".",
    "success"
  );

  formAnimal.reset();
  mostrarSexoAutomatico();
}

// Crea la identificación del animal sin depender de otro archivo.
function crearIdentificacionAnimal(caravanaVisual, codigoRFID) {
  const caravanaLimpia = String(caravanaVisual || "").trim();
  const rfidLimpio = String(codigoRFID || "").trim();

  let metodoIngreso = "manual";

  if (caravanaLimpia !== "" && rfidLimpio !== "") {
    metodoIngreso = "caravana_y_rfid";
  } else if (rfidLimpio !== "") {
    metodoIngreso = "rfid";
  } else if (caravanaLimpia !== "") {
    metodoIngreso = "caravana_visual";
  }

  return {
    caravanaVisual: caravanaLimpia,
    codigoRFID: rfidLimpio,
    metodoIngreso: metodoIngreso
  };
}

// Valida que tenga caravana visual o RFID.
function identificacionAnimalEsValida(identificacion) {
  if (!identificacion) return false;

  return (
    identificacion.caravanaVisual !== "" ||
    identificacion.codigoRFID !== ""
  );
}

// Determina el sexo automáticamente según la categoría.
function determinarSexoPorCategoria(categoria) {
  if (categoria === "Toro") return "Macho";
  if (categoria === "Novillo") return "Macho";
  if (categoria === "Ternero") return "Macho";

  if (categoria === "Vaca") return "Hembra";
  if (categoria === "Vaquillona") return "Hembra";
  if (categoria === "Ternera") return "Hembra";

  return "Sin definir";
}

// Muestra una ayuda visual del sexo que se asignará.
function mostrarSexoAutomatico() {
  const categoria = document.getElementById("categoria");
  const ayudaSexo = document.getElementById("ayudaSexoAutomatico");

  if (!categoria || !ayudaSexo) return;

  if (categoria.value === "") {
    ayudaSexo.textContent = "El sexo se asigna automáticamente según la categoría.";
    return;
  }

  const sexo = determinarSexoPorCategoria(categoria.value);

  ayudaSexo.textContent = "Sexo automático: " + sexo + ".";
}

// Evita duplicar animales por caravana o RFID.
function existeAnimalRegistrado(animales, caravanaVisual, codigoRFID) {
  const caravanaNueva = normalizarTextoAnimal(caravanaVisual);
  const rfidNuevo = normalizarTextoAnimal(codigoRFID);

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaExistente = normalizarTextoAnimal(animal.caravanaVisual || "");
    const rfidExistente = normalizarTextoAnimal(animal.codigoRFID || "");

    if (caravanaNueva !== "" && caravanaNueva === caravanaExistente) {
      return true;
    }

    if (rfidNuevo !== "" && rfidNuevo === rfidExistente) {
      return true;
    }
  }

  return false;
}

function buscarAnimal() {
  const inputBusqueda = document.getElementById("busquedaAnimal");
  const resultado = document.getElementById("resultadoBusqueda");

  if (!inputBusqueda || !resultado) return;

  const valorBusqueda = inputBusqueda.value.trim();

  if (valorBusqueda === "") {
    resultado.innerHTML = `
      <div class="alert alert-warning">
        Ingrese una caravana o RFID.
      </div>
    `;
    return;
  }

  const animales = obtenerAnimales();
  const valorNormalizado = normalizarTextoAnimal(valorBusqueda);

  let animalEncontrado = null;

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = normalizarTextoAnimal(animal.caravanaVisual || "");
    const codigoRFID = normalizarTextoAnimal(animal.codigoRFID || "");
    const ultimosOchoRFID = codigoRFID.length >= 8
      ? codigoRFID.slice(-8)
      : "";

    if (
      caravanaVisual === valorNormalizado ||
      codigoRFID === valorNormalizado ||
      ultimosOchoRFID === valorNormalizado
    ) {
      animalEncontrado = animal;
      break;
    }
  }

  if (!animalEncontrado) {
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
        <h2 class="h5 fw-bold">
          ${limpiarTextoAnimal(animalEncontrado.caravanaVisual || animalEncontrado.codigoRFID || "Animal")}
        </h2>

        <p><strong>Propietario:</strong> ${limpiarTextoAnimal(animalEncontrado.propietario || "Sin dato")}</p>
        <p><strong>Campo:</strong> ${limpiarTextoAnimal(animalEncontrado.campo || "Sin dato")}</p>
        <p><strong>Categoría:</strong> ${limpiarTextoAnimal(animalEncontrado.categoria || "Sin dato")}</p>
        <p><strong>Sexo:</strong> ${limpiarTextoAnimal(animalEncontrado.sexo || "Sin dato")}</p>
        <p><strong>Raza:</strong> ${limpiarTextoAnimal(animalEncontrado.raza || "Sin dato")}</p>
        <p><strong>Estado:</strong> ${limpiarTextoAnimal(animalEncontrado.estado || "Sin dato")}</p>
        <p><strong>RFID:</strong> ${limpiarTextoAnimal(animalEncontrado.codigoRFID || "Sin dato")}</p>
        <p><strong>Observaciones:</strong> ${limpiarTextoAnimal(animalEncontrado.observaciones || "Sin observaciones")}</p>
      </div>
    </div>
  `;
}

// Mensajes del formulario.
function mostrarMensajeRegistroAnimal(texto, tipo) {
  const mensaje = document.getElementById("mensajeRegistroAnimal");

  if (!mensaje) {
    alert(texto);
    return;
  }

  mensaje.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${limpiarTextoAnimal(texto)}
    </div>
  `;
}

// Normaliza texto para comparar.
function normalizarTextoAnimal(texto) {
  return String(texto)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

// Limpia texto para evitar problemas al imprimir HTML.
function limpiarTextoAnimal(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}