// Listados de RuralData.
// Muestra animales en formato compacto, permite filtrar por estado,
// desplegar ficha editable y manejar pesajes por animal.

let filtroEstadoAnimales = "todos";

document.addEventListener("DOMContentLoaded", function () {
  inicializarListadoAnimales();
  inicializarListadoControles();
  inicializarDatosCabeceraListados();
});





async function inicializarListadoAnimales() {
  const contenedorAnimales = document.getElementById("listaAnimales");
  const filtroListado = document.getElementById("filtroListadoAnimales");

  if (!contenedorAnimales) return;

  contenedorAnimales.innerHTML = `
    <div class="alert alert-info mb-0">
      Sincronizando animales...
    </div>
  `;

  await sincronizarAnimalesDesdeApiListado();

  inicializarFiltrosEstadoAnimales();

  if (filtroListado) {
    filtroListado.addEventListener("input", function () {
      mostrarListadoAnimales();
    });
  }

  mostrarListadoAnimales();
}




// Trae animales desde Turso y los mezcla con localStorage.
async function sincronizarAnimalesDesdeApiListado() {
  try {
    const respuesta = await fetch("/api/animales?establecimiento_id=demo_ruraldata");

    if (!respuesta.ok) {
      return;
    }

    const datos = await respuesta.json();

    if (!datos.ok || !Array.isArray(datos.animales)) {
      return;
    }

    const animalesLocales = obtenerAnimales();
    const animalesMezclados = animalesLocales.slice();

    for (let i = 0; i < datos.animales.length; i++) {
      const animalApi = convertirAnimalApiAAnimalLocal(datos.animales[i]);

      if (!animalExisteEnListaListado(animalesMezclados, animalApi)) {
        animalesMezclados.push(animalApi);
      }
    }

    guardarAnimales(animalesMezclados);
  } catch (error) {
    console.log("No se pudo sincronizar con Turso:", error);
  }
}

// Convierte columnas de Turso al formato local de RuralData.
function convertirAnimalApiAAnimalLocal(animalApi) {
  return {
    id: animalApi.id,
    caravanaVisual: animalApi.caravana_visual || "",
    codigoRFID: animalApi.codigo_rfid || "",
    categoria: animalApi.categoria || "",
    sexo: animalApi.sexo || "",
    raza: animalApi.raza || "",
    fechaNacimiento: animalApi.fecha_nacimiento || "",
    propietario: animalApi.propietario || "",
    campo: animalApi.campo || "",
    observaciones: animalApi.observaciones || "",
    origen: animalApi.origen || "turso",
    fechaRegistro: animalApi.fecha_registro || new Date().toISOString(),
    fechaActualizacion: animalApi.fecha_actualizacion || ""
  };
}

// Evita duplicar animales al mezclar Turso con localStorage.
function animalExisteEnListaListado(animales, animalNuevo) {
  const idNuevo = animalNuevo.id || "";
  const caravanaNueva = normalizarTextoListado(animalNuevo.caravanaVisual || "");
  const rfidNuevo = normalizarTextoListado(animalNuevo.codigoRFID || "");

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const idExistente = animal.id || "";
    const caravanaExistente = normalizarTextoListado(animal.caravanaVisual || "");
    const rfidExistente = normalizarTextoListado(animal.codigoRFID || "");

    if (idNuevo !== "" && idNuevo === idExistente) return true;
    if (caravanaNueva !== "" && caravanaNueva === caravanaExistente) return true;
    if (rfidNuevo !== "" && rfidNuevo === rfidExistente) return true;
  }

  return false;
}

function normalizarTextoListado(texto) {
  return String(texto || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}










// Inicializa botones de filtro por estado.
function inicializarFiltrosEstadoAnimales() {
  const btnTodos = document.getElementById("btnFiltroTodosAnimales");
  const btnPendientes = document.getElementById("btnFiltroPendientesAnimales");
  const btnCarencia = document.getElementById("btnFiltroCarenciaAnimales");
  const btnCompletos = document.getElementById("btnFiltroCompletosAnimales");

  if (btnTodos) {
    btnTodos.addEventListener("click", function () {
      cambiarFiltroEstadoAnimales("todos");
    });
  }

  if (btnPendientes) {
    btnPendientes.addEventListener("click", function () {
      cambiarFiltroEstadoAnimales("pendientes");
    });
  }

  if (btnCarencia) {
    btnCarencia.addEventListener("click", function () {
      cambiarFiltroEstadoAnimales("carencia");
    });
  }

  if (btnCompletos) {
    btnCompletos.addEventListener("click", function () {
      cambiarFiltroEstadoAnimales("completos");
    });
  }
}

// Cambia filtro activo.
function cambiarFiltroEstadoAnimales(filtro) {
  filtroEstadoAnimales = filtro;

  actualizarBotonesFiltroAnimales();
  actualizarTextoFiltroAnimales();
  mostrarListadoAnimales();
}

// Actualiza estilos de botones.
function actualizarBotonesFiltroAnimales() {
  const btnTodos = document.getElementById("btnFiltroTodosAnimales");
  const btnPendientes = document.getElementById("btnFiltroPendientesAnimales");
  const btnCarencia = document.getElementById("btnFiltroCarenciaAnimales");
  const btnCompletos = document.getElementById("btnFiltroCompletosAnimales");

  const botones = [
    btnTodos,
    btnPendientes,
    btnCarencia,
    btnCompletos
  ];

  for (let i = 0; i < botones.length; i++) {
    if (botones[i]) {
      botones[i].classList.remove("activo");
    }
  }

  if (filtroEstadoAnimales === "todos" && btnTodos) {
    btnTodos.classList.add("activo");
  }

  if (filtroEstadoAnimales === "pendientes" && btnPendientes) {
    btnPendientes.classList.add("activo");
  }

  if (filtroEstadoAnimales === "carencia" && btnCarencia) {
    btnCarencia.classList.add("activo");
  }

  if (filtroEstadoAnimales === "completos" && btnCompletos) {
    btnCompletos.classList.add("activo");
  }
}

// Actualiza texto explicativo del filtro.
function actualizarTextoFiltroAnimales() {
  const texto = document.getElementById("textoFiltroAnimales");

  if (!texto) return;

  if (filtroEstadoAnimales === "todos") {
    texto.textContent = "Mostrando todos los animales.";
  }

  if (filtroEstadoAnimales === "pendientes") {
    texto.textContent = "Mostrando animales con datos pendientes.";
  }

  if (filtroEstadoAnimales === "carencia") {
    texto.textContent = "Mostrando animales en carencia sanitaria.";
  }

  if (filtroEstadoAnimales === "completos") {
    texto.textContent = "Mostrando animales con datos completos.";
  }
}

// Muestra listado compacto de animales.
function mostrarListadoAnimales() {
  const contenedor = document.getElementById("listaAnimales");

  if (!contenedor) return;

  const animales = obtenerAnimalesFiltradosListado();
  const todosLosAnimales = obtenerAnimales();

  contenedor.innerHTML = "";

  actualizarResumenListadoAnimales(todosLosAnimales);
  actualizarBotonesFiltroAnimales();
  actualizarTextoFiltroAnimales();

  if (animales.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        No hay animales para mostrar con este filtro.
      </div>
    `;
    return;
  }

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const estado = obtenerEstadoVisualAnimalListado(animal);
    const sexoTexto = obtenerTextoSexoAnimalListado(animal);
    const iconoSexo = obtenerIconoSexoAnimalListado(animal);
    const textoPeso = obtenerTextoPesoAnimalListado(animal.id);

    const item = document.createElement("article");
    item.className = "animal-linea-compacta " + estado.claseLinea;

    item.innerHTML = `
      <div class="animal-linea-main">
        <strong>
          ${escaparHTMLListado(animal.caravanaVisual || obtenerUltimosOchoDigitosListado(animal.codigoRFID) || "Sin caravana")}
        </strong>

        <span>
          RFID: ${escaparHTMLListado(animal.codigoRFID || "Sin dato")}
        </span>
      </div>

      <div class="animal-linea-icons">

        <button
          type="button"
          class="animal-linea-icon-btn"
          onclick="desplegarFichaAnimalListado('${animal.id}')"
          title="Ver ficha"
        >
          <i class="bi bi-file-earmark-text"></i>
        </button>

        <span class="animal-linea-icon-info" title="${escaparHTMLListado(sexoTexto)}">
          <i class="bi ${iconoSexo}"></i>
        </span>

        <span class="animal-linea-campo" title="Campo / establecimiento">
          <i class="bi bi-geo-alt"></i>
          ${escaparHTMLListado(animal.campo || "Pendiente")}
        </span>

        <button
          type="button"
          class="animal-linea-peso-btn"
          onclick="desplegarPesajesAnimalListado('${animal.id}')"
          title="Pesajes del animal"
        >
          ${escaparHTMLListado(textoPeso)}
        </button>

        <span class="estado-pill ${estado.claseBadge}">
          ${estado.texto}
        </span>

      </div>

      <section
        id="fichaAnimalListado_${animal.id}"
        class="d-none animal-ficha-listado"
      ></section>

      <section
        id="pesajesAnimalListado_${animal.id}"
        class="d-none animal-ficha-listado"
      ></section>
    `;

    contenedor.appendChild(item);
  }
}

// Filtra animales por texto y estado.
function obtenerAnimalesFiltradosListado() {
  const animales = obtenerAnimales();
  const filtroTexto = document.getElementById("filtroListadoAnimales");

  const resultado = [];

  const texto = filtroTexto && filtroTexto.value.trim() !== ""
    ? filtroTexto.value.trim().toLowerCase()
    : "";

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    if (!cumpleFiltroEstadoAnimal(animal)) {
      continue;
    }

    if (texto.length > 0) {
      const contenido =
        (animal.caravanaVisual || "") + " " +
        (animal.codigoRFID || "") + " " +
        (animal.categoria || "") + " " +
        (animal.sexo || "") + " " +
        (animal.campo || "") + " " +
        (animal.propietario || "");

      if (!contenido.toLowerCase().includes(texto)) {
        continue;
      }
    }

    resultado.push(animal);
  }

  return resultado;
}

// Revisa si el animal cumple el filtro activo.
function cumpleFiltroEstadoAnimal(animal) {
  const tieneCarencia = obtenerCarenciaActivaAnimalListado(animal) !== null;
  const tienePendientes = animalTieneDatosPendientesListado(animal);

  if (filtroEstadoAnimales === "todos") {
    return true;
  }

  if (filtroEstadoAnimales === "pendientes") {
    return tienePendientes;
  }

  if (filtroEstadoAnimales === "carencia") {
    return tieneCarencia;
  }

  if (filtroEstadoAnimales === "completos") {
    return !tienePendientes && !tieneCarencia;
  }

  return true;
}

// Actualiza contadores del listado.
function actualizarResumenListadoAnimales(animales) {
  let completos = 0;
  let pendientes = 0;
  let carencia = 0;

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const tieneCarencia = obtenerCarenciaActivaAnimalListado(animal) !== null;
    const tienePendientes = animalTieneDatosPendientesListado(animal);

    if (tieneCarencia) {
      carencia++;
    }

    if (tienePendientes) {
      pendientes++;
    }

    if (!tienePendientes && !tieneCarencia) {
      completos++;
    }
  }

  actualizarTextoListado("totalAnimalesListado", animales.length);
  actualizarTextoListado("totalAnimalesCompletos", completos);
  actualizarTextoListado("totalAnimalesPendientes", pendientes);
  actualizarTextoListado("totalAnimalesCarencia", carencia);
}

// Despliega ficha del animal.
function desplegarFichaAnimalListado(idAnimal) {
  const animal = obtenerAnimalPorIdListado(idAnimal);
  const ficha = document.getElementById("fichaAnimalListado_" + idAnimal);

  if (!animal || !ficha) return;

  const yaAbierta = !ficha.classList.contains("d-none");

  cerrarFichasAnimalesListado();

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
              ${escaparHTMLListado(animal.caravanaVisual || "Animal sin caravana")}
            </h2>

            <p class="text-muted mb-0">
              Completá o corregí datos pendientes.
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            onclick="replegarFichaAnimalListado('${idAnimal}')"
          >
            Replegar
          </button>
        </div>

        <form id="formEditarAnimalListado_${idAnimal}" class="d-grid gap-3">

          <div>
            <label for="editarCaravanaVisual_${idAnimal}" class="form-label">
              Caravana visual
            </label>

            <input
              type="text"
              id="editarCaravanaVisual_${idAnimal}"
              class="form-control"
              value="${escaparAttrListado(animal.caravanaVisual || "")}"
            />
          </div>

          <div>
            <label for="editarCodigoRFID_${idAnimal}" class="form-label">
              Código RFID
            </label>

            <input
              type="text"
              id="editarCodigoRFID_${idAnimal}"
              class="form-control"
              value="${escaparAttrListado(animal.codigoRFID || "")}"
            />
          </div>

          <div class="row g-3">

            <div class="col-12 col-md-6">
              <label for="editarCategoriaAnimal_${idAnimal}" class="form-label">
                Categoría
              </label>

              <select id="editarCategoriaAnimal_${idAnimal}" class="form-select">
                ${crearOpcionesCategoriaAnimalListado(animal.categoria)}
              </select>
            </div>

            <div class="col-12 col-md-6">
              <label for="editarSexoAnimal_${idAnimal}" class="form-label">
                Sexo
              </label>

              <select id="editarSexoAnimal_${idAnimal}" class="form-select">
                ${crearOpcionesSexoAnimalListado(animal.sexo)}
              </select>
            </div>

          </div>

          <div class="row g-3">

            <div class="col-12 col-md-6">
              <label for="editarRazaAnimal_${idAnimal}" class="form-label">
                Raza
              </label>

              <input
                type="text"
                id="editarRazaAnimal_${idAnimal}"
                class="form-control"
                value="${escaparAttrListado(animal.raza || "")}"
                placeholder="Ej: Hereford, Aberdeen Angus"
              />
            </div>

            <div class="col-12 col-md-6">
              <label for="editarFechaNacimientoAnimal_${idAnimal}" class="form-label">
                Fecha de nacimiento
              </label>

              <input
                type="date"
                id="editarFechaNacimientoAnimal_${idAnimal}"
                class="form-control"
                value="${escaparAttrListado(animal.fechaNacimiento || "")}"
              />
            </div>

          </div>

          <div class="row g-3">

            <div class="col-12 col-md-6">
              <label for="editarPropietarioAnimal_${idAnimal}" class="form-label">
                Propietario
              </label>

              <input
                type="text"
                id="editarPropietarioAnimal_${idAnimal}"
                class="form-control"
                value="${escaparAttrListado(animal.propietario || "")}"
                placeholder="Pendiente SNIG"
              />
            </div>

            <div class="col-12 col-md-6">
              <label for="editarCampoAnimal_${idAnimal}" class="form-label">
                Campo / establecimiento
              </label>

              <input
                type="text"
                id="editarCampoAnimal_${idAnimal}"
                class="form-control"
                value="${escaparAttrListado(animal.campo || "")}"
                placeholder="Ej: San Jorge"
              />
            </div>

          </div>

          <div>
            <label for="editarObservacionesAnimal_${idAnimal}" class="form-label">
              Observaciones
            </label>

            <textarea
              id="editarObservacionesAnimal_${idAnimal}"
              class="form-control"
              rows="3"
              placeholder="Observaciones generales"
            >${escaparHTMLListado(animal.observaciones || "")}</textarea>
          </div>

          <button type="submit" class="btn btn-success btn-lg">
            Guardar cambios
          </button>

        </form>

      </div>
    </article>
  `;

  const formEditar = document.getElementById("formEditarAnimalListado_" + idAnimal);

  if (formEditar) {
    formEditar.addEventListener("submit", function (event) {
      event.preventDefault();
      guardarCambiosAnimalListado(idAnimal);
    });
  }
}

// Guarda cambios de un animal.
function guardarCambiosAnimalListado(idAnimal) {
  const animales = obtenerAnimales();

  for (let i = 0; i < animales.length; i++) {
    if (animales[i].id === idAnimal) {
      animales[i].caravanaVisual = document.getElementById("editarCaravanaVisual_" + idAnimal).value.trim();
      animales[i].codigoRFID = document.getElementById("editarCodigoRFID_" + idAnimal).value.trim();
      animales[i].categoria = document.getElementById("editarCategoriaAnimal_" + idAnimal).value;
      animales[i].sexo = document.getElementById("editarSexoAnimal_" + idAnimal).value;
      animales[i].raza = document.getElementById("editarRazaAnimal_" + idAnimal).value.trim();
      animales[i].fechaNacimiento = document.getElementById("editarFechaNacimientoAnimal_" + idAnimal).value;
      animales[i].propietario = document.getElementById("editarPropietarioAnimal_" + idAnimal).value.trim();
      animales[i].campo = document.getElementById("editarCampoAnimal_" + idAnimal).value.trim();
      animales[i].observaciones = document.getElementById("editarObservacionesAnimal_" + idAnimal).value.trim();
      animales[i].fechaActualizacion = new Date().toISOString();

      guardarAnimales(animales);

      mostrarListadoAnimales();

      setTimeout(function () {
        desplegarFichaAnimalListado(idAnimal);
      }, 100);

      return;
    }
  }
}

// Repliega ficha.
function replegarFichaAnimalListado(idAnimal) {
  const ficha = document.getElementById("fichaAnimalListado_" + idAnimal);

  if (!ficha) return;

  ficha.classList.add("d-none");
  ficha.innerHTML = "";
}

// Cierra todas las fichas.
function cerrarFichasAnimalesListado() {
  const fichas = document.querySelectorAll(".animal-ficha-listado");

  for (let i = 0; i < fichas.length; i++) {
    fichas[i].classList.add("d-none");
    fichas[i].innerHTML = "";
  }
}

// Despliega panel de pesajes.
function desplegarPesajesAnimalListado(idAnimal) {
  const animal = obtenerAnimalPorIdListado(idAnimal);
  const panel = document.getElementById("pesajesAnimalListado_" + idAnimal);

  if (!animal || !panel) return;

  const yaAbierto = !panel.classList.contains("d-none");

  cerrarFichasAnimalesListado();

  if (yaAbierto) {
    return;
  }

  panel.classList.remove("d-none");
  panel.innerHTML = crearPanelPesajesAnimalListado(animal);

  const formPesaje = document.getElementById("formPesajeAnimalListado_" + idAnimal);

  if (formPesaje) {
    formPesaje.addEventListener("submit", function (event) {
      event.preventDefault();
      guardarPesajeAnimalListado(idAnimal);
    });
  }
}

// Crea el panel completo de pesajes.
function crearPanelPesajesAnimalListado(animal) {
  const pesajes = obtenerPesajesAnimalOrdenadosListado(animal.id);
  const ultimoPesaje = obtenerUltimoPesajeAnimalListado(animal.id);

  let bloqueUltimo = `
    <div class="alert alert-info mb-3">
      Este animal todavía no tiene pesajes registrados.
    </div>
  `;

  if (ultimoPesaje) {
    bloqueUltimo = `
      <div class="pesaje-ultimo-card mb-3">
        <span>Último pesaje</span>
        <strong>${formatearPesoListado(ultimoPesaje.pesoKg)}</strong>
        <small>${formatearFechaListado(ultimoPesaje.fecha)}</small>
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
              ${escaparHTMLListado(animal.caravanaVisual || "Animal sin caravana")}
            </h2>

            <p class="text-muted mb-0">
              Registrá el peso del animal y revisá su desarrollo.
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-secondary btn-sm"
            onclick="replegarPesajesAnimalListado('${animal.id}')"
          >
            Replegar
          </button>
        </div>

        ${bloqueUltimo}

        <div id="mensajePesajeAnimalListado_${animal.id}" class="mb-3"></div>

        <form id="formPesajeAnimalListado_${animal.id}" class="card pesaje-form-card mb-4">
          <div class="card-body">

            <input type="hidden" id="pesajeEditando_${animal.id}" value="" />

            <h3 class="h6 mb-3" id="tituloFormPesaje_${animal.id}">
              Agregar pesaje
            </h3>

            <div class="row g-3">

              <div class="col-12 col-md-4">
                <label for="fechaPesaje_${animal.id}" class="form-label">
                  Fecha
                </label>

                <input
                  type="date"
                  id="fechaPesaje_${animal.id}"
                  class="form-control"
                  value="${obtenerFechaHoyListado()}"
                  required
                />
              </div>

              <div class="col-12 col-md-4">
                <label for="pesoKg_${animal.id}" class="form-label">
                  Peso en kg
                </label>

                <input
                  type="number"
                  id="pesoKg_${animal.id}"
                  class="form-control"
                  min="1"
                  step="0.1"
                  placeholder="Ej: 318"
                  required
                />
              </div>

              <div class="col-12 col-md-4">
                <label for="observacionPesaje_${animal.id}" class="form-label">
                  Observación
                </label>

                <input
                  type="text"
                  id="observacionPesaje_${animal.id}"
                  class="form-control"
                  placeholder="Opcional"
                />
              </div>

            </div>

            <div class="d-flex flex-wrap gap-2 mt-3">
              <button
                type="submit"
                id="btnGuardarPesaje_${animal.id}"
                class="btn btn-success"
              >
                Guardar pesaje
              </button>

              <button
                type="button"
                id="btnCancelarEdicionPesaje_${animal.id}"
                class="btn btn-outline-secondary d-none"
                onclick="cancelarEdicionPesajeListado('${animal.id}')"
              >
                Cancelar edición
              </button>
            </div>

          </div>
        </form>

        ${crearBloqueHistorialPesajesListado(animal.id, pesajes)}

        ${crearBloqueDesarrolloPesajesListado(pesajes)}

      </div>
    </article>
  `;
}

// Crea historial de pesajes.
// Crea historial de pesajes compacto.
function crearBloqueHistorialPesajesListado(idAnimal, pesajes) {
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
    const observacionCorta = recortarObservacionPesajeListado(
      pesaje.observaciones || "Sin observación",
      48
    );

    html += `
      <article class="pesaje-historial-item-compacto">
        <button
          type="button"
          class="pesaje-historial-delete-btn"
          onclick="eliminarPesajeAnimalListado('${idAnimal}', '${pesaje.id}')"
          title="Eliminar pesaje"
          aria-label="Eliminar pesaje"
        >
          <i class="bi bi-trash"></i>
        </button>

        <div class="pesaje-historial-contenido">
          <div class="pesaje-historial-linea-principal">
            <strong>${formatearPesoListado(pesaje.pesoKg)}</strong>
            <span>${formatearFechaListado(pesaje.fecha)}</span>
          </div>

          <div class="pesaje-historial-observacion" title="${escaparAttrListado(pesaje.observaciones || "Sin observación")}">
            ${escaparHTMLListado(observacionCorta)}
          </div>
        </div>
      </article>
    `;
  }

  html += `
      </div>
    </div>
  `;

  return html;
}
// Crea bloque de desarrollo.
function crearBloqueDesarrolloPesajesListado(pesajesOrdenadosDesc) {
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
          ${calcularDiferenciaPesoListado(pesajesAsc)}
        </span>
      </div>

      ${crearGraficaPesajesListado(pesajesAsc)}
    </div>
  `;
}

// Crea gráfica simple en SVG.
function crearGraficaPesajesListado(pesajesAsc) {
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

    const x = pesajesAsc.length === 1
      ? ancho / 2
      : margen + (i * (ancho - margen * 2)) / (pesajesAsc.length - 1);

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
          Inicio: ${formatearPesoListado(primerPesaje.pesoKg)}
        </span>

        <span>
          Actual: ${formatearPesoListado(ultimoPesaje.pesoKg)}
        </span>
      </div>

    </div>
  `;
}

// Guarda un pesaje nuevo o editado.
function guardarPesajeAnimalListado(idAnimal) {
  const inputFecha = document.getElementById("fechaPesaje_" + idAnimal);
  const inputPeso = document.getElementById("pesoKg_" + idAnimal);
  const inputObservacion = document.getElementById("observacionPesaje_" + idAnimal);
  const inputEditando = document.getElementById("pesajeEditando_" + idAnimal);

  if (!inputFecha || !inputPeso || !inputObservacion || !inputEditando) return;

  const fecha = inputFecha.value;
  const pesoKg = Number(inputPeso.value);
  const observaciones = inputObservacion.value.trim();
  const idEditando = inputEditando.value;

  if (!fecha) {
    mostrarMensajePesajeListado(idAnimal, "Debe ingresar una fecha.", "warning");
    return;
  }

  if (isNaN(pesoKg) || pesoKg <= 0) {
    mostrarMensajePesajeListado(idAnimal, "Debe ingresar un peso válido.", "warning");
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

  mostrarListadoAnimales();

  setTimeout(function () {
    desplegarPesajesAnimalListado(idAnimal);
  }, 100);
}

// Carga un pesaje en el formulario para editar.
function editarPesajeAnimalListado(idAnimal, idPesaje) {
  const pesajes = obtenerPesajes();
  let pesajeEncontrado = null;

  for (let i = 0; i < pesajes.length; i++) {
    if (pesajes[i].id === idPesaje) {
      pesajeEncontrado = pesajes[i];
      break;
    }
  }

  if (!pesajeEncontrado) return;

  document.getElementById("pesajeEditando_" + idAnimal).value = pesajeEncontrado.id;
  document.getElementById("fechaPesaje_" + idAnimal).value = pesajeEncontrado.fecha;
  document.getElementById("pesoKg_" + idAnimal).value = pesajeEncontrado.pesoKg;
  document.getElementById("observacionPesaje_" + idAnimal).value = pesajeEncontrado.observaciones || "";

  actualizarTextoListado("tituloFormPesaje_" + idAnimal, "Editar pesaje");
  actualizarTextoListado("btnGuardarPesaje_" + idAnimal, "Guardar cambios");

  const btnCancelar = document.getElementById("btnCancelarEdicionPesaje_" + idAnimal);

  if (btnCancelar) {
    btnCancelar.classList.remove("d-none");
  }
}

// Cancela edición.
function cancelarEdicionPesajeListado(idAnimal) {
  const inputEditando = document.getElementById("pesajeEditando_" + idAnimal);
  const inputFecha = document.getElementById("fechaPesaje_" + idAnimal);
  const inputPeso = document.getElementById("pesoKg_" + idAnimal);
  const inputObservacion = document.getElementById("observacionPesaje_" + idAnimal);
  const btnCancelar = document.getElementById("btnCancelarEdicionPesaje_" + idAnimal);

  if (inputEditando) inputEditando.value = "";
  if (inputFecha) inputFecha.value = obtenerFechaHoyListado();
  if (inputPeso) inputPeso.value = "";
  if (inputObservacion) inputObservacion.value = "";

  actualizarTextoListado("tituloFormPesaje_" + idAnimal, "Agregar pesaje");
  actualizarTextoListado("btnGuardarPesaje_" + idAnimal, "Guardar pesaje");

  if (btnCancelar) {
    btnCancelar.classList.add("d-none");
  }
}

// Elimina un pesaje.
function eliminarPesajeAnimalListado(idAnimal, idPesaje) {
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

  mostrarListadoAnimales();

  setTimeout(function () {
    desplegarPesajesAnimalListado(idAnimal);
  }, 100);
}

// Repliega panel de pesajes.
function replegarPesajesAnimalListado(idAnimal) {
  const panel = document.getElementById("pesajesAnimalListado_" + idAnimal);

  if (!panel) return;

  panel.classList.add("d-none");
  panel.innerHTML = "";
}

// Muestra mensaje dentro del panel de pesaje.
function mostrarMensajePesajeListado(idAnimal, texto, tipo) {
  const contenedor = document.getElementById("mensajePesajeAnimalListado_" + idAnimal);

  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${texto}
    </div>
  `;
}

// Obtiene texto del botón de peso.
function obtenerTextoPesoAnimalListado(idAnimal) {
  const ultimoPesaje = obtenerUltimoPesajeAnimalListado(idAnimal);

  if (!ultimoPesaje) {
    return "Sin kg";
  }

  return formatearPesoListado(ultimoPesaje.pesoKg);
}

// Obtiene último pesaje.
function obtenerUltimoPesajeAnimalListado(idAnimal) {
  const pesajes = obtenerPesajesAnimalOrdenadosListado(idAnimal);

  if (pesajes.length === 0) {
    return null;
  }

  return pesajes[0];
}

// Obtiene pesajes de un animal ordenados del más nuevo al más viejo.
function obtenerPesajesAnimalOrdenadosListado(idAnimal) {
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

// Calcula diferencia entre primer y último pesaje.
function calcularDiferenciaPesoListado(pesajesAsc) {
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

// Obtiene fecha de hoy.
function obtenerFechaHoyListado() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return anio + "-" + mes + "-" + dia;
}

// Formatea peso.
function formatearPesoListado(peso) {
  const numero = Number(peso);

  if (isNaN(numero)) {
    return "Sin kg";
  }

  if (Number.isInteger(numero)) {
    return numero + " kg";
  }

  return numero.toFixed(1) + " kg";
}


// recorta observaciones largas del historial de pesajes
function recortarObservacionPesajeListado(texto, limite) {
  const valor = String(texto || "").trim();

  if (valor === "") {
    return "Sin observación";
  }

  if (valor.length <= limite) {
    return valor;
  }

  return valor.slice(0, limite).trim() + "...";
}


// Obtiene animal por id.
function obtenerAnimalPorIdListado(idAnimal) {
  const animales = obtenerAnimales();

  for (let i = 0; i < animales.length; i++) {
    if (animales[i].id === idAnimal) {
      return animales[i];
    }
  }

  return null;
}

// Crea opciones de categoría.
function crearOpcionesCategoriaAnimalListado(valorActual) {
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

  return crearOpcionesSelectListado(opciones, valorActual || "Pendiente SNIG");
}

// Crea opciones de sexo.
function crearOpcionesSexoAnimalListado(valorActual) {
  const opciones = [
    "Pendiente SNIG",
    "Sin definir",
    "Macho",
    "Hembra"
  ];

  return crearOpcionesSelectListado(opciones, valorActual || "Pendiente SNIG");
}

// Crea opciones para select.
function crearOpcionesSelectListado(opciones, valorActual) {
  let html = "";

  for (let i = 0; i < opciones.length; i++) {
    const seleccionada = opciones[i] === valorActual ? "selected" : "";

    html += `
      <option value="${escaparAttrListado(opciones[i])}" ${seleccionada}>
        ${escaparHTMLListado(opciones[i])}
      </option>
    `;
  }

  return html;
}

// Estado visual.
function obtenerEstadoVisualAnimalListado(animal) {
  const carencia = obtenerCarenciaActivaAnimalListado(animal);

  if (carencia) {
    return {
      texto: "En carencia",
      claseBadge: "badge-soft-red",
      claseLinea: "animal-linea-alerta"
    };
  }

  if (animalTieneDatosPendientesListado(animal)) {
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

// Revisa carencia activa.
function obtenerCarenciaActivaAnimalListado(animal) {
  const registros = obtenerSanidad();
  const claveAnimal = obtenerClaveAnimalListado(animal);

  let carenciaActiva = null;

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia) > 0;

    if (!tieneCarencia || !registro.fechaLiberacion) continue;

    const claveRegistro = obtenerClaveSanidadListado(registro);

    if (claveRegistro !== claveAnimal) continue;

    const estado = obtenerEstadoCarenciaListado(registro.fechaLiberacion);

    if (estado !== "En carencia") continue;

    if (!carenciaActiva) {
      carenciaActiva = registro;
      continue;
    }

    const fechaActual = obtenerFechaDesdeISOListado(carenciaActiva.fechaLiberacion);
    const fechaNueva = obtenerFechaDesdeISOListado(registro.fechaLiberacion);

    if (fechaNueva > fechaActual) {
      carenciaActiva = registro;
    }
  }

  return carenciaActiva;
}

// Detecta datos pendientes.
function animalTieneDatosPendientesListado(animal) {
  if (datoPendienteListado(animal.categoria)) return true;
  if (datoPendienteListado(animal.sexo)) return true;
  if (datoPendienteListado(animal.campo)) return true;

  return false;
}

function datoPendienteListado(valor) {
  if (!valor) return true;

  const texto = String(valor).trim().toLowerCase();

  if (texto === "") return true;
  if (texto === "sin definir") return true;
  if (texto === "pendiente snig") return true;
  if (texto === "pendiente") return true;

  return false;
}

// Texto de sexo.
function obtenerTextoSexoAnimalListado(animal) {
  if (!animal.sexo) return "Sexo pendiente";

  return animal.sexo;
}

// Icono de sexo.
function obtenerIconoSexoAnimalListado(animal) {
  const sexo = animal.sexo ? animal.sexo.toLowerCase() : "";

  if (sexo === "macho") return "bi-gender-male";
  if (sexo === "hembra") return "bi-gender-female";

  return "bi-gender-ambiguous";
}

// Clave animal.
function obtenerClaveAnimalListado(animal) {
  if (animal.id) return animal.id;
  if (animal.caravanaVisual) return animal.caravanaVisual;
  if (animal.codigoRFID) return animal.codigoRFID;

  return "animal_sin_id";
}

// Clave sanidad.
function obtenerClaveSanidadListado(registro) {
  if (registro.animalId) return registro.animalId;
  if (registro.caravanaVisual) return registro.caravanaVisual;
  if (registro.codigoRFID) return registro.codigoRFID;
  if (registro.identificacion) return registro.identificacion;

  return registro.id;
}

// Estado de carencia.
function obtenerEstadoCarenciaListado(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraListado(new Date());
  const fecha = obtenerFechaDesdeISOListado(fechaLiberacion);

  if (fecha > hoy) {
    return "En carencia";
  }

  return "Liberado";
}

// Fecha local.
function obtenerFechaDesdeISOListado(fechaISO) {
  const partes = fechaISO.split("-");

  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  return new Date(anio, mes, dia);
}

// Quita hora.
function obtenerFechaSinHoraListado(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );
}

// Últimos 8 dígitos.
function obtenerUltimosOchoDigitosListado(valor) {
  if (!valor) return "";

  const soloNumeros = String(valor).replace(/\D/g, "");

  if (soloNumeros.length < 8) {
    return "";
  }

  return soloNumeros.slice(-8);
}

// Listado de controles sanitarios viejo, para no romper la pantalla de controles.
function inicializarListadoControles() {
  const contenedor =
    document.getElementById("listaControles") ||
    document.getElementById("listaControlesSanidad");

  if (!contenedor) return;

  const registros = obtenerSanidad();

  contenedor.innerHTML = "";

  if (registros.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        No hay controles sanitarios registrados.
      </div>
    `;
    return;
  }

  const registrosOrdenados = registros.slice().sort(function (a, b) {
    const fechaA = a.fechaRegistro || a.fechaAplicacion || "";
    const fechaB = b.fechaRegistro || b.fechaAplicacion || "";

    if (fechaA < fechaB) return 1;
    if (fechaA > fechaB) return -1;
    return 0;
  });

  for (let i = 0; i < registrosOrdenados.length; i++) {
    const registro = registrosOrdenados[i];

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <span class="estado-pill badge-soft-green mb-3">
          Control sanitario
        </span>

        <h3 class="h5 mb-2">
          ${escaparHTMLListado(registro.producto || "Producto sin nombre")}
        </h3>

        <p class="mb-1">
          Caravana: ${escaparHTMLListado(registro.caravanaVisual || registro.identificacion || "Sin dato")}
        </p>

        <p class="mb-1">
          Tipo: ${escaparHTMLListado(registro.tipoControl || "Sin dato")}
        </p>

        <p class="mb-1">
          Aplicación: ${formatearFechaListado(registro.fechaAplicacion)}
        </p>

        <p class="mb-0">
          Liberación: ${registro.fechaLiberacion ? formatearFechaListado(registro.fechaLiberacion) : "No aplica"}
        </p>
      </div>
    `;

    contenedor.appendChild(item);
  }
}

// Formatea fecha.
function formatearFechaListado(fechaISO) {
  if (!fechaISO) return "Sin dato";

  const partes = fechaISO.split("-");

  if (partes.length !== 3) return fechaISO;

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Escapa texto para HTML.
function escaparHTMLListado(texto) {
  if (!texto) return "";

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Escapa atributos.
function escaparAttrListado(texto) {
  return escaparHTMLListado(texto);
}

// Actualiza texto por id.
function actualizarTextoListado(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}

// Datos vivos de cabecera.
function inicializarDatosCabeceraListados() {
  actualizarDatosCabeceraListados();

  setInterval(function () {
    actualizarDatosCabeceraListados();
  }, 1000);
}

function actualizarDatosCabeceraListados() {
  const ahora = new Date();

  actualizarTextoListado("infoDia", obtenerDiaTextoListado(ahora));
  actualizarTextoListado("infoHora", obtenerHoraTextoListado(ahora));
  actualizarTextoListado("infoLuna", obtenerFaseLunarListado(ahora));

  const rotativo = document.getElementById("infoRotativaMobile");

  if (rotativo) {
    rotativo.textContent = "Animales";
  }
}

function obtenerDiaTextoListado(fecha) {
  const opciones = {
    weekday: "long",
    day: "2-digit",
    month: "long"
  };

  let texto = fecha.toLocaleDateString("es-UY", opciones);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerHoraTextoListado(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerFaseLunarListado(fecha) {
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