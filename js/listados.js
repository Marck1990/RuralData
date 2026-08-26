// Listados de RuralData.
// Muestra animales en formato compacto y permite desplegar ficha editable.

let animalesListadoActual = [];

document.addEventListener("DOMContentLoaded", function () {
  inicializarListadoAnimales();
  inicializarListadoControles();
  inicializarDatosCabeceraListados();
});

function inicializarListadoAnimales() {
  const contenedorAnimales = document.getElementById("listaAnimales");
  const filtroListado = document.getElementById("filtroListadoAnimales");

  if (!contenedorAnimales) return;

  animalesListadoActual = obtenerAnimales();

  if (filtroListado) {
    filtroListado.addEventListener("input", function () {
      mostrarListadoAnimales();
    });
  }

  mostrarListadoAnimales();
}

// Muestra listado compacto de animales.
function mostrarListadoAnimales() {
  const contenedor = document.getElementById("listaAnimales");

  if (!contenedor) return;

  const animales = obtenerAnimalesFiltradosListado();
  const todosLosAnimales = obtenerAnimales();

  contenedor.innerHTML = "";

  actualizarResumenListadoAnimales(todosLosAnimales);

  if (animales.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        No hay animales para mostrar.
      </div>
    `;
    return;
  }

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const estado = obtenerEstadoVisualAnimalListado(animal);
    const sexoTexto = obtenerTextoSexoAnimalListado(animal);
    const iconoSexo = obtenerIconoSexoAnimalListado(animal);

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

        <span class="estado-pill ${estado.claseBadge}">
          ${estado.texto}
        </span>

      </div>

      <section
        id="fichaAnimalListado_${animal.id}"
        class="d-none animal-ficha-listado"
      ></section>
    `;

    contenedor.appendChild(item);
  }
}

// Filtra animales por texto.
function obtenerAnimalesFiltradosListado() {
  const animales = obtenerAnimales();
  const filtro = document.getElementById("filtroListadoAnimales");

  if (!filtro || filtro.value.trim() === "") {
    return animales;
  }

  const texto = filtro.value.trim().toLowerCase();
  const resultado = [];

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const contenido =
      (animal.caravanaVisual || "") + " " +
      (animal.codigoRFID || "") + " " +
      (animal.categoria || "") + " " +
      (animal.sexo || "") + " " +
      (animal.campo || "") + " " +
      (animal.propietario || "");

    if (contenido.toLowerCase().includes(texto)) {
      resultado.push(animal);
    }
  }

  return resultado;
}

// Actualiza contadores del listado.
function actualizarResumenListadoAnimales(animales) {
  let completos = 0;
  let pendientes = 0;
  let carencia = 0;

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    if (obtenerCarenciaActivaAnimalListado(animal)) {
      carencia++;
    }

    if (animalTieneDatosPendientesListado(animal)) {
      pendientes++;
    } else {
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