// Búsqueda rápida por caravana visual o RFID.
// Muestra una línea compacta, permite desplegar ficha completa
// y manejar pesajes del animal.

let animalBuscadoActual = null;

document.addEventListener("DOMContentLoaded", function () {
  inicializarBusquedaAnimal();
  inicializarDatosCabeceraIdentificacion();
});

function inicializarBusquedaAnimal() {
  const formBuscarAnimal = document.getElementById("formBuscarAnimal");
  const inputBusqueda = document.getElementById("identificacionBusqueda");

  if (formBuscarAnimal) {
    formBuscarAnimal.addEventListener("submit", function (event) {
      event.preventDefault();
      buscarAnimalDesdeFormulario();
    });
  }

  if (inputBusqueda) {
    inputBusqueda.focus();

    inputBusqueda.addEventListener("input", function () {
      const valor = inputBusqueda.value.trim();

      if (valor.length === 0) {
        limpiarResultadoBusquedaAnimal();
      }
    });
  }
}

// Busca el animal ingresado en el formulario.
function buscarAnimalDesdeFormulario() {
  const inputBusqueda = document.getElementById("identificacionBusqueda");

  if (!inputBusqueda) return;

  const identificacion = inputBusqueda.value.trim();

  if (identificacion.length === 0) {
    mostrarMensajeBusquedaAnimal("Debe ingresar una caravana o RFID.", "warning");
    return;
  }

  const animal = buscarAnimalPorIdentificacionCompacta(identificacion);

  if (!animal) {
    animalBuscadoActual = null;

    mostrarMensajeBusquedaAnimal(
      "No se encontró un animal registrado con esa caravana o RFID.",
      "warning"
    );

    limpiarResultadoBusquedaAnimal();
    prepararInputBusquedaAnimal();

    return;
  }

  animalBuscadoActual = animal;

  mostrarMensajeBusquedaAnimal("Animal encontrado correctamente.", "success");
  mostrarAnimalCompacto(animal);
  prepararInputBusquedaAnimal();
}

// Busca animal por caravana, RFID completo o últimos 8 dígitos.
function buscarAnimalPorIdentificacionCompacta(identificacion) {
  const animales = obtenerAnimales();

  const identificacionNormalizada = normalizarTextoIdentificacion(identificacion);
  const ultimosOchoBusqueda = obtenerUltimosOchoDigitosIdentificacion(identificacion);

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = animal.caravanaVisual ? animal.caravanaVisual.trim() : "";
    const codigoRFID = animal.codigoRFID ? animal.codigoRFID.trim() : "";

    const caravanaNormalizada = normalizarTextoIdentificacion(caravanaVisual);
    const rfidNormalizado = normalizarTextoIdentificacion(codigoRFID);

    const caravanaOcho = obtenerUltimosOchoDigitosIdentificacion(caravanaVisual);
    const rfidOcho = obtenerUltimosOchoDigitosIdentificacion(codigoRFID);

    if (
      caravanaNormalizada === identificacionNormalizada ||
      rfidNormalizado === identificacionNormalizada ||
      caravanaOcho === ultimosOchoBusqueda ||
      rfidOcho === ultimosOchoBusqueda
    ) {
      return animal;
    }
  }

  return null;
}

// Muestra una línea compacta del animal.
function mostrarAnimalCompacto(animal) {
  const contenedor = document.getElementById("resultadoBusquedaAnimal");

  if (!contenedor) return;

  const estado = obtenerEstadoVisualAnimal(animal);
  const sexoTexto = obtenerTextoSexoAnimal(animal);
  const iconoSexo = obtenerIconoSexoAnimal(animal);
  const textoPeso = obtenerTextoPesoAnimalIdentificacion(animal.id);

  contenedor.innerHTML = `
    <article class="animal-linea-compacta ${estado.claseLinea}">
      <div class="animal-linea-main">
        <strong>
          ${escaparHTMLIdentificacion(animal.caravanaVisual || obtenerUltimosOchoDigitosIdentificacion(animal.codigoRFID) || "Sin caravana")}
        </strong>

        <span>
          RFID: ${escaparHTMLIdentificacion(animal.codigoRFID || "Sin dato")}
        </span>
      </div>

      <div class="animal-linea-icons">

        <button
          type="button"
          class="animal-linea-icon-btn"
          onclick="desplegarFichaAnimal('${animal.id}')"
          title="Ver ficha"
        >
          <i class="bi bi-file-earmark-text"></i>
        </button>

        <span class="animal-linea-icon-info" title="${escaparHTMLIdentificacion(sexoTexto)}">
          <i class="bi ${iconoSexo}"></i>
        </span>

        <span class="animal-linea-campo" title="Campo / establecimiento">
          <i class="bi bi-geo-alt"></i>
          ${escaparHTMLIdentificacion(animal.campo || "Pendiente")}
        </span>

        <button
          type="button"
          class="animal-linea-peso-btn"
          onclick="desplegarPesajesAnimalIdentificacion('${animal.id}')"
          title="Pesajes del animal"
        >
          ${escaparHTMLIdentificacion(textoPeso)}
        </button>

        <span class="estado-pill ${estado.claseBadge}">
          ${estado.texto}
        </span>

      </div>
    </article>

    <section id="fichaAnimalDesplegada" class="d-none animal-ficha-listado"></section>
    <section id="pesajesAnimalBusqueda_${animal.id}" class="d-none animal-ficha-listado"></section>
  `;
}

// Despliega la ficha completa.
function desplegarFichaAnimal(idAnimal) {
  const animal = obtenerAnimalPorId(idAnimal);
  const ficha = document.getElementById("fichaAnimalDesplegada");

  if (!animal || !ficha) return;

  const yaAbierta = !ficha.classList.contains("d-none");

  cerrarPanelesBusquedaAnimal();

  if (yaAbierta) {
    return;
  }

  ficha.classList.remove("d-none");

  ficha.innerHTML = `
    <article class="card mt-3">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <span class="badge badge-soft-green mb-2">
              Ficha del animal
            </span>

            <h2 class="h5 mb-1">
              ${escaparHTMLIdentificacion(animal.caravanaVisual || "Animal sin caravana")}
            </h2>

            <p class="text-muted mb-0">
              Podés completar o corregir datos pendientes.
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            onclick="replegarFichaAnimal()"
          >
            Replegar
          </button>
        </div>

        <form id="formEditarAnimalBuscado" class="d-grid gap-3">

          <div>
            <label for="editarCaravanaVisual" class="form-label">
              Caravana visual
            </label>

            <input
              type="text"
              id="editarCaravanaVisual"
              class="form-control"
              value="${escaparAttrIdentificacion(animal.caravanaVisual || "")}"
            />
          </div>

          <div>
            <label for="editarCodigoRFID" class="form-label">
              Código RFID
            </label>

            <input
              type="text"
              id="editarCodigoRFID"
              class="form-control"
              value="${escaparAttrIdentificacion(animal.codigoRFID || "")}"
            />
          </div>

          <div class="row g-3">

            <div class="col-12 col-md-6">
              <label for="editarCategoriaAnimal" class="form-label">
                Categoría
              </label>

              <select id="editarCategoriaAnimal" class="form-select">
                ${crearOpcionesCategoriaAnimal(animal.categoria)}
              </select>
            </div>

            <div class="col-12 col-md-6">
              <label for="editarSexoAnimal" class="form-label">
                Sexo
              </label>

              <select id="editarSexoAnimal" class="form-select">
                ${crearOpcionesSexoAnimal(animal.sexo)}
              </select>
            </div>

          </div>

          <div class="row g-3">

            <div class="col-12 col-md-6">
              <label for="editarRazaAnimal" class="form-label">
                Raza
              </label>

              <input
                type="text"
                id="editarRazaAnimal"
                class="form-control"
                value="${escaparAttrIdentificacion(animal.raza || "")}"
                placeholder="Ej: Hereford, Aberdeen Angus"
              />
            </div>

            <div class="col-12 col-md-6">
              <label for="editarFechaNacimientoAnimal" class="form-label">
                Fecha de nacimiento
              </label>

              <input
                type="date"
                id="editarFechaNacimientoAnimal"
                class="form-control"
                value="${escaparAttrIdentificacion(animal.fechaNacimiento || "")}"
              />
            </div>

          </div>

          <div class="row g-3">

            <div class="col-12 col-md-6">
              <label for="editarPropietarioAnimal" class="form-label">
                Propietario
              </label>

              <input
                type="text"
                id="editarPropietarioAnimal"
                class="form-control"
                value="${escaparAttrIdentificacion(animal.propietario || "")}"
                placeholder="Pendiente SNIG"
              />
            </div>

            <div class="col-12 col-md-6">
              <label for="editarCampoAnimal" class="form-label">
                Campo / establecimiento
              </label>

              <input
                type="text"
                id="editarCampoAnimal"
                class="form-control"
                value="${escaparAttrIdentificacion(animal.campo || "")}"
                placeholder="Ej: San Jorge"
              />
            </div>

          </div>

          <div>
            <label for="editarObservacionesAnimal" class="form-label">
              Observaciones
            </label>

            <textarea
              id="editarObservacionesAnimal"
              class="form-control"
              rows="3"
              placeholder="Observaciones generales"
            >${escaparHTMLIdentificacion(animal.observaciones || "")}</textarea>
          </div>

          <button type="submit" class="btn btn-success btn-lg">
            Guardar cambios
          </button>

        </form>

      </div>
    </article>
  `;

  const formEditar = document.getElementById("formEditarAnimalBuscado");

  if (formEditar) {
    formEditar.addEventListener("submit", function (event) {
      event.preventDefault();
      guardarCambiosAnimalBuscado(idAnimal);
    });
  }
}

// Guarda los cambios del animal.
function guardarCambiosAnimalBuscado(idAnimal) {
  const animales = obtenerAnimales();

  for (let i = 0; i < animales.length; i++) {
    if (animales[i].id === idAnimal) {
      animales[i].caravanaVisual = document.getElementById("editarCaravanaVisual").value.trim();
      animales[i].codigoRFID = document.getElementById("editarCodigoRFID").value.trim();
      animales[i].categoria = document.getElementById("editarCategoriaAnimal").value;
      animales[i].sexo = document.getElementById("editarSexoAnimal").value;
      animales[i].raza = document.getElementById("editarRazaAnimal").value.trim();
      animales[i].fechaNacimiento = document.getElementById("editarFechaNacimientoAnimal").value;
      animales[i].propietario = document.getElementById("editarPropietarioAnimal").value.trim();
      animales[i].campo = document.getElementById("editarCampoAnimal").value.trim();
      animales[i].observaciones = document.getElementById("editarObservacionesAnimal").value.trim();
      animales[i].fechaActualizacion = new Date().toISOString();

      guardarAnimales(animales);

      animalBuscadoActual = animales[i];

      mostrarMensajeBusquedaAnimal("Datos del animal actualizados correctamente.", "success");
      mostrarAnimalCompacto(animales[i]);

      setTimeout(function () {
        desplegarFichaAnimal(idAnimal);
      }, 100);

      return;
    }
  }

  mostrarMensajeBusquedaAnimal("No se pudo guardar el animal.", "danger");
}

// Despliega panel de pesajes.
function desplegarPesajesAnimalIdentificacion(idAnimal) {
  const animal = obtenerAnimalPorId(idAnimal);
  const panel = document.getElementById("pesajesAnimalBusqueda_" + idAnimal);

  if (!animal || !panel) return;

  const yaAbierto = !panel.classList.contains("d-none");

  cerrarPanelesBusquedaAnimal();

  if (yaAbierto) {
    return;
  }

  panel.classList.remove("d-none");
  panel.innerHTML = crearPanelPesajesAnimalIdentificacion(animal);

  const formPesaje = document.getElementById("formPesajeAnimalBusqueda_" + idAnimal);

  if (formPesaje) {
    formPesaje.addEventListener("submit", function (event) {
      event.preventDefault();
      guardarPesajeAnimalIdentificacion(idAnimal);
    });
  }
}

// Crea panel de pesajes.
function crearPanelPesajesAnimalIdentificacion(animal) {
  const pesajes = obtenerPesajesAnimalOrdenadosIdentificacion(animal.id);
  const ultimoPesaje = obtenerUltimoPesajeAnimalIdentificacion(animal.id);

  let bloqueUltimo = `
    <div class="alert alert-info mb-3">
      Este animal todavía no tiene pesajes registrados.
    </div>
  `;

  if (ultimoPesaje) {
    bloqueUltimo = `
      <div class="pesaje-ultimo-card mb-3">
        <span>Último pesaje</span>
        <strong>${formatearPesoIdentificacion(ultimoPesaje.pesoKg)}</strong>
        <small>${formatearFechaIdentificacion(ultimoPesaje.fecha)}</small>
      </div>
    `;
  }

  return `
    <article class="card mt-3">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <span class="badge badge-soft-green mb-2">
              Pesajes
            </span>

            <h2 class="h5 mb-1">
              ${escaparHTMLIdentificacion(animal.caravanaVisual || "Animal sin caravana")}
            </h2>

            <p class="text-muted mb-0">
              Registrá el peso del animal y revisá su desarrollo.
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            onclick="replegarPesajesAnimalIdentificacion('${animal.id}')"
          >
            Replegar
          </button>
        </div>

        ${bloqueUltimo}

        <div id="mensajePesajeAnimalBusqueda_${animal.id}" class="mb-3"></div>

        <form id="formPesajeAnimalBusqueda_${animal.id}" class="card pesaje-form-card mb-4">
          <div class="card-body">

            <input type="hidden" id="pesajeEditandoBusqueda_${animal.id}" value="" />

            <h3 class="h6 mb-3" id="tituloFormPesajeBusqueda_${animal.id}">
              Agregar pesaje
            </h3>

            <div class="row g-3">

              <div class="col-12 col-md-4">
                <label for="fechaPesajeBusqueda_${animal.id}" class="form-label">
                  Fecha
                </label>

                <input
                  type="date"
                  id="fechaPesajeBusqueda_${animal.id}"
                  class="form-control"
                  value="${obtenerFechaHoyIdentificacion()}"
                  required
                />
              </div>

              <div class="col-12 col-md-4">
                <label for="pesoKgBusqueda_${animal.id}" class="form-label">
                  Peso en kg
                </label>

                <input
                  type="number"
                  id="pesoKgBusqueda_${animal.id}"
                  class="form-control"
                  min="1"
                  step="0.1"
                  placeholder="Ej: 318"
                  required
                />
              </div>

              <div class="col-12 col-md-4">
                <label for="observacionPesajeBusqueda_${animal.id}" class="form-label">
                  Observación
                </label>

                <input
                  type="text"
                  id="observacionPesajeBusqueda_${animal.id}"
                  class="form-control"
                  placeholder="Opcional"
                />
              </div>

            </div>

            <div class="d-flex flex-wrap gap-2 mt-3">
              <button
                type="submit"
                id="btnGuardarPesajeBusqueda_${animal.id}"
                class="btn btn-success"
              >
                Guardar pesaje
              </button>

              <button
                type="button"
                id="btnCancelarEdicionPesajeBusqueda_${animal.id}"
                class="btn btn-outline-secondary d-none"
                onclick="cancelarEdicionPesajeIdentificacion('${animal.id}')"
              >
                Cancelar edición
              </button>
            </div>

          </div>
        </form>

        ${crearBloqueHistorialPesajesIdentificacion(animal.id, pesajes)}

        ${crearBloqueDesarrolloPesajesIdentificacion(pesajes)}

      </div>
    </article>
  `;
}

// Historial de pesajes.
function crearBloqueHistorialPesajesIdentificacion(idAnimal, pesajes) {
  if (pesajes.length === 0) {
    return `
      <div class="alert alert-light border mb-0">
        Sin historial de pesajes.
      </div>
    `;
  }

  let html = `
    <div class="mb-4">
      <h3 class="h6 mb-3">
        Historial
      </h3>

      <div class="d-grid gap-2">
  `;

  for (let i = 0; i < pesajes.length; i++) {
    const pesaje = pesajes[i];

    html += `
      <div class="pesaje-historial-item">
        <div>
          <strong>${formatearPesoIdentificacion(pesaje.pesoKg)}</strong>
          <span>${formatearFechaIdentificacion(pesaje.fecha)}</span>
          <small>${escaparHTMLIdentificacion(pesaje.observaciones || "Sin observación")}</small>
        </div>

        <div class="pesaje-historial-actions">
          <button
            type="button"
            class="btn btn-outline-success btn-sm"
            onclick="editarPesajeAnimalIdentificacion('${idAnimal}', '${pesaje.id}')"
          >
            Editar
          </button>

          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            onclick="eliminarPesajeAnimalIdentificacion('${idAnimal}', '${pesaje.id}')"
          >
            Eliminar
          </button>
        </div>
      </div>
    `;
  }

  html += `
      </div>
    </div>
  `;

  return html;
}

// Desarrollo.
function crearBloqueDesarrolloPesajesIdentificacion(pesajesOrdenadosDesc) {
  if (pesajesOrdenadosDesc.length < 2) {
    return `
      <div class="alert alert-warning mb-0">
        El desarrollo se mostrará cuando el animal tenga 2 o más pesajes.
      </div>
    `;
  }

  const pesajesAsc = pesajesOrdenadosDesc.slice().reverse();

  return `
    <div class="desarrollo-pesaje-card">
      <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h3 class="h6 mb-1">
            Desarrollo
          </h3>

          <p class="text-muted mb-0">
            Evolución entre pesaje y pesaje.
          </p>
        </div>

        <span class="estado-pill badge-soft-green">
          ${calcularDiferenciaPesoIdentificacion(pesajesAsc)}
        </span>
      </div>

      ${crearGraficaPesajesIdentificacion(pesajesAsc)}
    </div>
  `;
}

// Gráfica simple en SVG.
function crearGraficaPesajesIdentificacion(pesajesAsc) {
  const ancho = 340;
  const alto = 180;
  const margen = 28;

  let pesoMin = Number(pesajesAsc[0].pesoKg);
  let pesoMax = Number(pesajesAsc[0].pesoKg);

  for (let i = 0; i < pesajesAsc.length; i++) {
    const peso = Number(pesajesAsc[i].pesoKg);

    if (peso < pesoMin) pesoMin = peso;
    if (peso > pesoMax) pesoMax = peso;
  }

  if (pesoMin === pesoMax) {
    pesoMin = pesoMin - 5;
    pesoMax = pesoMax + 5;
  }

  let puntos = "";
  let circulos = "";

  for (let i = 0; i < pesajesAsc.length; i++) {
    const peso = Number(pesajesAsc[i].pesoKg);

    const x = margen + (i * (ancho - margen * 2)) / (pesajesAsc.length - 1);
    const y = alto - margen - ((peso - pesoMin) * (alto - margen * 2)) / (pesoMax - pesoMin);

    puntos += x + "," + y + " ";

    circulos += `
      <circle cx="${x}" cy="${y}" r="4"></circle>
    `;
  }

  const primerPesaje = pesajesAsc[0];
  const ultimoPesaje = pesajesAsc[pesajesAsc.length - 1];

  return `
    <div class="grafica-pesaje-wrapper">

      <svg
        class="grafica-pesaje"
        viewBox="0 0 ${ancho} ${alto}"
        role="img"
        aria-label="Gráfica de evolución de peso"
      >
        <line x1="${margen}" y1="${alto - margen}" x2="${ancho - margen}" y2="${alto - margen}"></line>
        <line x1="${margen}" y1="${margen}" x2="${margen}" y2="${alto - margen}"></line>

        <polyline points="${puntos.trim()}"></polyline>

        ${circulos}
      </svg>

      <div class="grafica-pesaje-info">
        <span>
          Inicio: ${formatearPesoIdentificacion(primerPesaje.pesoKg)}
        </span>

        <span>
          Actual: ${formatearPesoIdentificacion(ultimoPesaje.pesoKg)}
        </span>
      </div>

    </div>
  `;
}

// Guarda pesaje.
function guardarPesajeAnimalIdentificacion(idAnimal) {
  const inputFecha = document.getElementById("fechaPesajeBusqueda_" + idAnimal);
  const inputPeso = document.getElementById("pesoKgBusqueda_" + idAnimal);
  const inputObservacion = document.getElementById("observacionPesajeBusqueda_" + idAnimal);
  const inputEditando = document.getElementById("pesajeEditandoBusqueda_" + idAnimal);

  if (!inputFecha || !inputPeso || !inputObservacion || !inputEditando) return;

  const fecha = inputFecha.value;
  const pesoKg = Number(inputPeso.value);
  const observaciones = inputObservacion.value.trim();
  const idEditando = inputEditando.value;

  if (!fecha) {
    mostrarMensajePesajeIdentificacion(idAnimal, "Debe ingresar una fecha.", "warning");
    return;
  }

  if (isNaN(pesoKg) || pesoKg <= 0) {
    mostrarMensajePesajeIdentificacion(idAnimal, "Debe ingresar un peso válido.", "warning");
    return;
  }

  const pesajes = obtenerPesajes();

  if (idEditando) {
    for (let i = 0; i < pesajes.length; i++) {
      if (pesajes[i].id === idEditando) {
        pesajes[i].fecha = fecha;
        pesajes[i].pesoKg = pesoKg;
        pesajes[i].observaciones = observaciones;
        pesajes[i].fechaActualizacion = new Date().toISOString();
      }
    }
  } else {
    const nuevoPesaje = {
      id: crypto.randomUUID(),
      animalId: idAnimal,
      fecha: fecha,
      pesoKg: pesoKg,
      observaciones: observaciones,
      origen: "manual",
      fechaRegistro: new Date().toISOString()
    };

    pesajes.push(nuevoPesaje);
  }

  guardarPesajes(pesajes);

  const animal = obtenerAnimalPorId(idAnimal);

  if (animal) {
    mostrarAnimalCompacto(animal);

    setTimeout(function () {
      desplegarPesajesAnimalIdentificacion(idAnimal);
    }, 100);
  }
}

// Edita pesaje.
function editarPesajeAnimalIdentificacion(idAnimal, idPesaje) {
  const pesajes = obtenerPesajes();
  let pesajeEncontrado = null;

  for (let i = 0; i < pesajes.length; i++) {
    if (pesajes[i].id === idPesaje) {
      pesajeEncontrado = pesajes[i];
      break;
    }
  }

  if (!pesajeEncontrado) return;

  document.getElementById("pesajeEditandoBusqueda_" + idAnimal).value = pesajeEncontrado.id;
  document.getElementById("fechaPesajeBusqueda_" + idAnimal).value = pesajeEncontrado.fecha;
  document.getElementById("pesoKgBusqueda_" + idAnimal).value = pesajeEncontrado.pesoKg;
  document.getElementById("observacionPesajeBusqueda_" + idAnimal).value = pesajeEncontrado.observaciones || "";

  actualizarTextoIdentificacion("tituloFormPesajeBusqueda_" + idAnimal, "Editar pesaje");
  actualizarTextoIdentificacion("btnGuardarPesajeBusqueda_" + idAnimal, "Guardar cambios");

  const btnCancelar = document.getElementById("btnCancelarEdicionPesajeBusqueda_" + idAnimal);

  if (btnCancelar) {
    btnCancelar.classList.remove("d-none");
  }
}

// Cancela edición.
function cancelarEdicionPesajeIdentificacion(idAnimal) {
  const inputEditando = document.getElementById("pesajeEditandoBusqueda_" + idAnimal);
  const inputFecha = document.getElementById("fechaPesajeBusqueda_" + idAnimal);
  const inputPeso = document.getElementById("pesoKgBusqueda_" + idAnimal);
  const inputObservacion = document.getElementById("observacionPesajeBusqueda_" + idAnimal);
  const btnCancelar = document.getElementById("btnCancelarEdicionPesajeBusqueda_" + idAnimal);

  if (inputEditando) inputEditando.value = "";
  if (inputFecha) inputFecha.value = obtenerFechaHoyIdentificacion();
  if (inputPeso) inputPeso.value = "";
  if (inputObservacion) inputObservacion.value = "";

  actualizarTextoIdentificacion("tituloFormPesajeBusqueda_" + idAnimal, "Agregar pesaje");
  actualizarTextoIdentificacion("btnGuardarPesajeBusqueda_" + idAnimal, "Guardar pesaje");

  if (btnCancelar) {
    btnCancelar.classList.add("d-none");
  }
}

// Elimina pesaje.
function eliminarPesajeAnimalIdentificacion(idAnimal, idPesaje) {
  const confirmar = confirm("¿Eliminar este pesaje?");

  if (!confirmar) return;

  const pesajes = obtenerPesajes();
  const nuevosPesajes = [];

  for (let i = 0; i < pesajes.length; i++) {
    if (pesajes[i].id !== idPesaje) {
      nuevosPesajes.push(pesajes[i]);
    }
  }

  guardarPesajes(nuevosPesajes);

  const animal = obtenerAnimalPorId(idAnimal);

  if (animal) {
    mostrarAnimalCompacto(animal);

    setTimeout(function () {
      desplegarPesajesAnimalIdentificacion(idAnimal);
    }, 100);
  }
}

// Repliega pesajes.
function replegarPesajesAnimalIdentificacion(idAnimal) {
  const panel = document.getElementById("pesajesAnimalBusqueda_" + idAnimal);

  if (!panel) return;

  panel.classList.add("d-none");
  panel.innerHTML = "";
}

// Cierra paneles abiertos.
function cerrarPanelesBusquedaAnimal() {
  const ficha = document.getElementById("fichaAnimalDesplegada");

  if (ficha) {
    ficha.classList.add("d-none");
    ficha.innerHTML = "";
  }

  const panelesPesaje = document.querySelectorAll("[id^='pesajesAnimalBusqueda_']");

  for (let i = 0; i < panelesPesaje.length; i++) {
    panelesPesaje[i].classList.add("d-none");
    panelesPesaje[i].innerHTML = "";
  }
}

// Repliega la ficha completa.
function replegarFichaAnimal() {
  const ficha = document.getElementById("fichaAnimalDesplegada");

  if (!ficha) return;

  ficha.classList.add("d-none");
  ficha.innerHTML = "";
}

// Mensaje de pesaje.
function mostrarMensajePesajeIdentificacion(idAnimal, texto, tipo) {
  const contenedor = document.getElementById("mensajePesajeAnimalBusqueda_" + idAnimal);

  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${texto}
    </div>
  `;
}

// Texto del botón kg.
function obtenerTextoPesoAnimalIdentificacion(idAnimal) {
  const ultimoPesaje = obtenerUltimoPesajeAnimalIdentificacion(idAnimal);

  if (!ultimoPesaje) {
    return "Sin kg";
  }

  return formatearPesoIdentificacion(ultimoPesaje.pesoKg);
}

// Último pesaje.
function obtenerUltimoPesajeAnimalIdentificacion(idAnimal) {
  const pesajes = obtenerPesajesAnimalOrdenadosIdentificacion(idAnimal);

  if (pesajes.length === 0) {
    return null;
  }

  return pesajes[0];
}

// Pesajes ordenados del más nuevo al más viejo.
function obtenerPesajesAnimalOrdenadosIdentificacion(idAnimal) {
  const pesajes = obtenerPesajes();
  const pesajesAnimal = [];

  for (let i = 0; i < pesajes.length; i++) {
    if (pesajes[i].animalId === idAnimal) {
      pesajesAnimal.push(pesajes[i]);
    }
  }

  pesajesAnimal.sort(function (a, b) {
    if (a.fecha < b.fecha) return 1;
    if (a.fecha > b.fecha) return -1;

    const registroA = a.fechaRegistro || "";
    const registroB = b.fechaRegistro || "";

    if (registroA < registroB) return 1;
    if (registroA > registroB) return -1;

    return 0;
  });

  return pesajesAnimal;
}

// Diferencia de peso.
function calcularDiferenciaPesoIdentificacion(pesajesAsc) {
  if (pesajesAsc.length < 2) {
    return "Sin evolución";
  }

  const primerPeso = Number(pesajesAsc[0].pesoKg);
  const ultimoPeso = Number(pesajesAsc[pesajesAsc.length - 1].pesoKg);
  const diferencia = ultimoPeso - primerPeso;

  if (diferencia > 0) {
    return "+" + diferencia.toFixed(1) + " kg";
  }

  if (diferencia < 0) {
    return diferencia.toFixed(1) + " kg";
  }

  return "0 kg";
}

// Fecha de hoy.
function obtenerFechaHoyIdentificacion() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return anio + "-" + mes + "-" + dia;
}

// Formatea peso.
function formatearPesoIdentificacion(peso) {
  const numero = Number(peso);

  if (isNaN(numero)) {
    return "Sin kg";
  }

  if (Number.isInteger(numero)) {
    return numero + " kg";
  }

  return numero.toFixed(1) + " kg";
}

// Formatea fecha.
function formatearFechaIdentificacion(fechaISO) {
  if (!fechaISO) return "Sin dato";

  const partes = fechaISO.split("-");

  if (partes.length !== 3) return fechaISO;

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Obtiene animal por id.
function obtenerAnimalPorId(idAnimal) {
  const animales = obtenerAnimales();

  for (let i = 0; i < animales.length; i++) {
    if (animales[i].id === idAnimal) {
      return animales[i];
    }
  }

  return null;
}

// Crea opciones de categoría.
function crearOpcionesCategoriaAnimal(valorActual) {
  const opciones = [
    "Pendiente SNIG",
    "Sin definir",
    "Ternero",
    "Ternera",
    "Novillo",
    "Vaquillona",
    "Vaca",
    "Toro",
    "Buey",
    "Otro"
  ];

  return crearOpcionesSelect(opciones, valorActual || "Pendiente SNIG");
}

// Crea opciones de sexo.
function crearOpcionesSexoAnimal(valorActual) {
  const opciones = [
    "Pendiente SNIG",
    "Sin definir",
    "Macho",
    "Hembra"
  ];

  return crearOpcionesSelect(opciones, valorActual || "Pendiente SNIG");
}

// Crea opciones para un select.
function crearOpcionesSelect(opciones, valorActual) {
  let html = "";

  for (let i = 0; i < opciones.length; i++) {
    const seleccionada = opciones[i] === valorActual ? "selected" : "";

    html += `
      <option value="${escaparAttrIdentificacion(opciones[i])}" ${seleccionada}>
        ${escaparHTMLIdentificacion(opciones[i])}
      </option>
    `;
  }

  return html;
}

// Devuelve el estado visual del animal.
function obtenerEstadoVisualAnimal(animal) {
  const carencia = obtenerCarenciaActivaAnimal(animal);

  if (carencia) {
    return {
      texto: "En carencia",
      claseBadge: "badge-soft-red",
      claseLinea: "animal-linea-alerta"
    };
  }

  if (animalTieneDatosPendientes(animal)) {
    return {
      texto: "Pendiente",
      claseBadge: "badge-soft-yellow",
      claseLinea: "animal-linea-pendiente"
    };
  }

  return {
    texto: "Completo",
    claseBadge: "badge-soft-green",
    claseLinea: "animal-linea-ok"
  };
}

// Revisa si el animal tiene una carencia vigente.
function obtenerCarenciaActivaAnimal(animal) {
  const registros = obtenerSanidad();
  const claveAnimal = obtenerClaveAnimalIdentificacion(animal);

  let carenciaActiva = null;

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia) > 0;

    if (!tieneCarencia || !registro.fechaLiberacion) continue;

    const claveRegistro = obtenerClaveSanidadIdentificacion(registro);

    if (claveRegistro !== claveAnimal) continue;

    const estado = obtenerEstadoCarenciaIdentificacion(registro.fechaLiberacion);

    if (estado !== "En carencia") continue;

    if (!carenciaActiva) {
      carenciaActiva = registro;
      continue;
    }

    const fechaActual = obtenerFechaDesdeISOIdentificacion(carenciaActiva.fechaLiberacion);
    const fechaNueva = obtenerFechaDesdeISOIdentificacion(registro.fechaLiberacion);

    if (fechaNueva > fechaActual) {
      carenciaActiva = registro;
    }
  }

  return carenciaActiva;
}

// Detecta datos pendientes.
function animalTieneDatosPendientes(animal) {
  if (datoPendienteAnimal(animal.categoria)) return true;
  if (datoPendienteAnimal(animal.sexo)) return true;
  if (datoPendienteAnimal(animal.campo)) return true;

  return false;
}

function datoPendienteAnimal(valor) {
  if (!valor) return true;

  const texto = String(valor).trim().toLowerCase();

  if (texto === "") return true;
  if (texto === "sin definir") return true;
  if (texto === "pendiente snig") return true;
  if (texto === "pendiente") return true;

  return false;
}

// Devuelve texto de sexo.
function obtenerTextoSexoAnimal(animal) {
  if (!animal.sexo) return "Sexo pendiente";

  return animal.sexo;
}

// Devuelve icono de sexo.
function obtenerIconoSexoAnimal(animal) {
  const sexo = animal.sexo ? animal.sexo.toLowerCase() : "";

  if (sexo === "macho") return "bi-gender-male";
  if (sexo === "hembra") return "bi-gender-female";

  return "bi-gender-ambiguous";
}

// Clave única del animal.
function obtenerClaveAnimalIdentificacion(animal) {
  if (animal.id) return animal.id;
  if (animal.caravanaVisual) return animal.caravanaVisual;
  if (animal.codigoRFID) return animal.codigoRFID;

  return "animal_sin_id";
}

// Clave única desde sanidad.
function obtenerClaveSanidadIdentificacion(registro) {
  if (registro.animalId) return registro.animalId;
  if (registro.caravanaVisual) return registro.caravanaVisual;
  if (registro.codigoRFID) return registro.codigoRFID;
  if (registro.identificacion) return registro.identificacion;

  return registro.id;
}

// Estado de carencia.
function obtenerEstadoCarenciaIdentificacion(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraIdentificacion(new Date());
  const fecha = obtenerFechaDesdeISOIdentificacion(fechaLiberacion);

  if (fecha > hoy) {
    return "En carencia";
  }

  return "Liberado";
}

// Convierte yyyy-mm-dd a Date local.
function obtenerFechaDesdeISOIdentificacion(fechaISO) {
  const partes = fechaISO.split("-");

  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  return new Date(anio, mes, dia);
}

// Fecha sin hora.
function obtenerFechaSinHoraIdentificacion(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );
}

// Normaliza texto.
function normalizarTextoIdentificacion(valor) {
  if (!valor) return "";

  return String(valor).trim().toUpperCase();
}

// Obtiene últimos 8 dígitos.
function obtenerUltimosOchoDigitosIdentificacion(valor) {
  if (!valor) return "";

  const soloNumeros = String(valor).replace(/\D/g, "");

  if (soloNumeros.length < 8) {
    return "";
  }

  return soloNumeros.slice(-8);
}

// Limpia resultado.
function limpiarResultadoBusquedaAnimal() {
  const contenedor = document.getElementById("resultadoBusquedaAnimal");

  if (!contenedor) return;

  contenedor.innerHTML = "";
}

// Mensaje de búsqueda.
function mostrarMensajeBusquedaAnimal(texto, tipo) {
  const mensaje = document.getElementById("mensajeBusquedaAnimal");

  if (!mensaje) return;

  mensaje.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${texto}
    </div>
  `;
}

// Deja listo el input para otra lectura.
function prepararInputBusquedaAnimal() {
  const inputBusqueda = document.getElementById("identificacionBusqueda");

  if (!inputBusqueda) return;

  setTimeout(function () {
    inputBusqueda.focus();
    inputBusqueda.select();
  }, 150);
}

// Escapa texto.
function escaparHTMLIdentificacion(texto) {
  if (!texto) return "";

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Escapa atributos.
function escaparAttrIdentificacion(texto) {
  return escaparHTMLIdentificacion(texto);
}

// Datos vivos de cabecera.
function inicializarDatosCabeceraIdentificacion() {
  actualizarDatosCabeceraIdentificacion();

  setInterval(function () {
    actualizarDatosCabeceraIdentificacion();
  }, 1000);
}

function actualizarDatosCabeceraIdentificacion() {
  const ahora = new Date();

  actualizarTextoIdentificacion("infoDia", obtenerDiaTextoIdentificacion(ahora));
  actualizarTextoIdentificacion("infoHora", obtenerHoraTextoIdentificacion(ahora));
  actualizarTextoIdentificacion("infoLuna", obtenerFaseLunarIdentificacion(ahora));

  const rotativo = document.getElementById("infoRotativaMobile");

  if (rotativo) {
    rotativo.textContent = "Buscar animal";
  }
}

function obtenerDiaTextoIdentificacion(fecha) {
  const opciones = {
    weekday: "long",
    day: "2-digit",
    month: "long"
  };

  let texto = fecha.toLocaleDateString("es-UY", opciones);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerHoraTextoIdentificacion(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerFaseLunarIdentificacion(fecha) {
  const lunaNuevaReferencia = new Date("2000-01-06T18:14:00Z");
  const cicloLunar = 29.53058867;

  const diferenciaTiempo = fecha.getTime() - lunaNuevaReferencia.getTime();
  const diasPasados = diferenciaTiempo / (1000 * 60 * 60 * 24);

  let fase = (diasPasados % cicloLunar) / cicloLunar;

  if (fase < 0) {
    fase = fase + 1;
  }

  if (fase < 0.03 || fase > 0.97) return "Luna nueva";
  if (fase < 0.22) return "Luna creciente";
  if (fase < 0.28) return "Cuarto creciente";
  if (fase < 0.47) return "Gibosa creciente";
  if (fase < 0.53) return "Luna llena";
  if (fase < 0.72) return "Gibosa menguante";
  if (fase < 0.78) return "Cuarto menguante";

  return "Luna menguante";
}

function actualizarTextoIdentificacion(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}