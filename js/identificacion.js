// Búsqueda rápida por caravana visual o RFID.
// Muestra una línea compacta y permite desplegar la ficha completa para editar.

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

  contenedor.innerHTML = `
    <article class="animal-linea-compacta ${estado.claseLinea}">
      <div class="animal-linea-main">
        <strong>
          ${animal.caravanaVisual || obtenerUltimosOchoDigitosIdentificacion(animal.codigoRFID) || "Sin caravana"}
        </strong>

        <span>
          RFID: ${animal.codigoRFID || "Sin dato"}
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

        <span class="animal-linea-icon-info" title="${sexoTexto}">
          <i class="bi ${iconoSexo}"></i>
        </span>

        <span class="animal-linea-campo" title="Campo / establecimiento">
          <i class="bi bi-geo-alt"></i>
          ${animal.campo || "Pendiente"}
        </span>

        <span class="estado-pill ${estado.claseBadge}">
          ${estado.texto}
        </span>

      </div>
    </article>

    <section id="fichaAnimalDesplegada" class="d-none"></section>
  `;
}

// Despliega la ficha completa.
function desplegarFichaAnimal(idAnimal) {
  const animal = obtenerAnimalPorId(idAnimal);
  const ficha = document.getElementById("fichaAnimalDesplegada");

  if (!animal || !ficha) return;

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
              ${animal.caravanaVisual || "Animal sin caravana"}
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
              value="${animal.caravanaVisual || ""}"
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
              value="${animal.codigoRFID || ""}"
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
                value="${animal.raza || ""}"
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
                value="${animal.fechaNacimiento || ""}"
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
                value="${animal.propietario || ""}"
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
                value="${animal.campo || ""}"
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
            >${animal.observaciones || ""}</textarea>
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
      desplegarFichaAnimal(idAnimal);

      return;
    }
  }

  mostrarMensajeBusquedaAnimal("No se pudo guardar el animal.", "danger");
}

// Repliega la ficha completa.
function replegarFichaAnimal() {
  const ficha = document.getElementById("fichaAnimalDesplegada");

  if (!ficha) return;

  ficha.classList.add("d-none");
  ficha.innerHTML = "";
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
      <option value="${opciones[i]}" ${seleccionada}>
        ${opciones[i]}
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