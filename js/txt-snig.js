// Pre TXT / SNIG de RuralData.
// Arma una lista preventiva y bloquea animales con carencia sanitaria vigente.
// Genera líneas con estructura similar al TXT de ejemplo:
// [|PREFIJO_URUGUAY + CARAVANA_8_DIGITOS|DDMMAAAA|HHMMSS|NRO_GUIA|.|.|.|.|.|.|.|.|.|.|]

let totalBloqueadosTxt = 0;

document.addEventListener("DOMContentLoaded", function () {
  inicializarTxtSnig();
  inicializarDatosCabeceraTxt();
});

function inicializarTxtSnig() {
  const formAgregarAnimalTxt = document.getElementById("formAgregarAnimalTxt");
  const btnLimpiarListaTxt = document.getElementById("btnLimpiarListaTxt");
  const btnDescargarTxt = document.getElementById("btnDescargarTxt");
  const numeroGuiaTxt = document.getElementById("numeroGuiaTxt");
  const inputIdentificacion = document.getElementById("identificacionTxt");

  if (formAgregarAnimalTxt) {
    formAgregarAnimalTxt.addEventListener("submit", agregarAnimalAListaTxt);
  }

  if (btnLimpiarListaTxt) {
    btnLimpiarListaTxt.addEventListener("click", limpiarListaTxt);
  }

  if (btnDescargarTxt) {
    btnDescargarTxt.addEventListener("click", descargarTxtPreventivo);
  }

  if (numeroGuiaTxt) {
    numeroGuiaTxt.addEventListener("input", function () {
      actualizarVistaPreviaTxt();
    });
  }

  if (inputIdentificacion) {
    inputIdentificacion.focus();
  }

  mostrarListaTxt();
  actualizarVistaPreviaTxt();
}

// Agrega animal apto a la lista.
function agregarAnimalAListaTxt(event) {
  event.preventDefault();

  const inputIdentificacion = document.getElementById("identificacionTxt");
  const identificacion = inputIdentificacion.value.trim();

  if (identificacion.length === 0) {
    mostrarResultadoTxt("Debe ingresar una caravana o RFID.", "warning");
    prepararInputTxt();
    return;
  }

  const animal = buscarAnimalPorIdentificacionTxt(identificacion);

  if (!animal) {
    mostrarResultadoTxt(
      "No se encontró un animal registrado con esa caravana o RFID.",
      "warning"
    );
    prepararInputTxt();
    return;
  }

  const caravanaOchoDigitos = obtenerCaravanaOchoDigitosAnimal(animal, identificacion);

  if (!caravanaOchoDigitos) {
    mostrarResultadoTxt(
      "No se pudo obtener una caravana válida de 8 números para generar el TXT.",
      "danger"
    );
    prepararInputTxt();
    return;
  }

  const carenciasActivas = obtenerCarenciasActivasPorAnimalTxt();
  const claveAnimal = obtenerClaveAnimalTxt(animal);
  const carencia = carenciasActivas[claveAnimal];

  if (carencia) {
    totalBloqueadosTxt++;

    mostrarResultadoBloqueadoTxt(animal, carencia);
    actualizarContadoresTxt();
    prepararInputTxt();

    return;
  }

  const lista = obtenerListaTxt();
  const yaExiste = existeAnimalEnListaTxt(lista, animal, caravanaOchoDigitos);

  if (yaExiste) {
    mostrarResultadoTxt(
      "Este animal ya fue agregado a la lista preventiva.",
      "info"
    );
    prepararInputTxt();
    return;
  }

  const nuevoItem = {
    id: crypto.randomUUID(),
    animalId: animal.id || "",
    caravanaVisual: animal.caravanaVisual || "",
    codigoRFID: animal.codigoRFID || "",
    caravanaOchoDigitos: caravanaOchoDigitos,
    categoria: animal.categoria || "",
    sexo: animal.sexo || "",
    campo: animal.campo || "",
    fechaLectura: obtenerFechaActualTxt(),
    horaLectura: obtenerHoraActualTxt()
  };

  lista.push(nuevoItem);
  guardarListaTxt(lista);

  mostrarResultadoAptoTxt(animal, caravanaOchoDigitos);
  mostrarListaTxt();
  actualizarVistaPreviaTxt();
  actualizarContadoresTxt();
  prepararInputTxt();
}

// Busca animal por caravana visual o RFID.
function buscarAnimalPorIdentificacionTxt(identificacion) {
  const animales = obtenerAnimales();
  const identificacionNormalizada = normalizarIdentificacionTxt(identificacion);
  const caravanaBuscada = obtenerUltimosOchoDigitos(identificacion);

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = animal.caravanaVisual ? animal.caravanaVisual.trim() : "";
    const codigoRFID = animal.codigoRFID ? animal.codigoRFID.trim() : "";

    const caravanaVisualNormalizada = normalizarIdentificacionTxt(caravanaVisual);
    const codigoRFIDNormalizado = normalizarIdentificacionTxt(codigoRFID);

    const caravanaVisualOcho = obtenerUltimosOchoDigitos(caravanaVisual);
    const codigoRFIDOcho = obtenerUltimosOchoDigitos(codigoRFID);

    if (
      caravanaVisualNormalizada === identificacionNormalizada ||
      codigoRFIDNormalizado === identificacionNormalizada ||
      caravanaVisualOcho === caravanaBuscada ||
      codigoRFIDOcho === caravanaBuscada
    ) {
      return animal;
    }
  }

  return null;
}

// Verifica si el animal ya está en la lista.
function existeAnimalEnListaTxt(lista, animal, caravanaOchoDigitos) {
  const claveAnimal = obtenerClaveAnimalTxt(animal);

  for (let i = 0; i < lista.length; i++) {
    const claveLista =
      lista[i].animalId ||
      lista[i].caravanaVisual ||
      lista[i].codigoRFID ||
      lista[i].id;

    if (claveLista === claveAnimal) {
      return true;
    }

    if (
      lista[i].caravanaOchoDigitos &&
      lista[i].caravanaOchoDigitos === caravanaOchoDigitos
    ) {
      return true;
    }
  }

  return false;
}

// Muestra animal apto agregado.
function mostrarResultadoAptoTxt(animal, caravanaOchoDigitos) {
  const resultado = document.getElementById("resultadoTxt");

  if (!resultado) return;

  resultado.innerHTML = `
    <div class="alert alert-success mb-0">
      <h3 class="h5 mb-2">
        Animal agregado a la lista
      </h3>

      <p class="mb-1">
        Caravana: <strong>${animal.caravanaVisual || caravanaOchoDigitos}</strong>
      </p>

      <p class="mb-1">
        Caravana TXT: <strong>${obtenerPrefijoUruguayTxt() + caravanaOchoDigitos}</strong>
      </p>

      <p class="mb-1">
        RFID: ${animal.codigoRFID || "Sin dato"}
      </p>

      <p class="mb-0">
        Estado: <strong>Apto según registros locales</strong>
      </p>
    </div>
  `;
}

// Muestra animal bloqueado por carencia.
function mostrarResultadoBloqueadoTxt(animal, carencia) {
  const resultado = document.getElementById("resultadoTxt");

  if (!resultado) return;

  const diasRestantes = calcularDiasRestantesTxt(carencia.fechaLiberacion);

  resultado.innerHTML = `
    <div class="alert alert-danger mb-0">
      <h3 class="h5 mb-2">
        Animal bloqueado
      </h3>

      <p class="mb-1">
        Caravana: <strong>${animal.caravanaVisual || "Sin dato"}</strong>
      </p>

      <p class="mb-1">
        RFID: ${animal.codigoRFID || "Sin dato"}
      </p>

      <p class="mb-1">
        Producto: ${carencia.producto || "Sin dato"}
      </p>

      <p class="mb-1">
        Liberación sanitaria: <strong>${formatearFechaTxt(carencia.fechaLiberacion)}</strong>
      </p>

      <p class="mb-0">
        No se agregó al TXT preventivo. Restan <strong>${diasRestantes}</strong> día(s).
      </p>
    </div>
  `;
}

// Muestra mensaje simple.
function mostrarResultadoTxt(texto, tipo) {
  const resultado = document.getElementById("resultadoTxt");

  if (!resultado) return;

  resultado.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${texto}
    </div>
  `;
}

// Deja el input listo para la próxima lectura.
function prepararInputTxt() {
  const inputIdentificacion = document.getElementById("identificacionTxt");

  if (!inputIdentificacion) return;

  setTimeout(function () {
    inputIdentificacion.focus();
    inputIdentificacion.select();
  }, 150);
}

// Muestra la lista de animales agregados.
function mostrarListaTxt() {
  const contenedor = document.getElementById("listaAnimalesTxt");

  if (!contenedor) return;

  const lista = obtenerListaTxt();

  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        Todavía no hay animales agregados a la lista preventiva.
      </div>
    `;

    actualizarContadoresTxt();
    return;
  }

  for (let i = 0; i < lista.length; i++) {
    const itemLista = lista[i];

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <span class="estado-pill badge-soft-green mb-3">
              Agregado
            </span>

            <h3 class="h5 mb-2">
              ${itemLista.caravanaVisual || itemLista.caravanaOchoDigitos || "Animal sin caravana"}
            </h3>

            <p class="mb-1">
              Caravana TXT: ${obtenerIdentificadorParaTxt(itemLista)}
            </p>

            <p class="mb-1">
              RFID: ${itemLista.codigoRFID || "Sin dato"}
            </p>

            <p class="mb-1">
              Categoría: ${itemLista.categoria || "Sin dato"}
            </p>

            <p class="mb-0">
              Lectura: ${itemLista.fechaLectura} ${itemLista.horaLectura}
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            onclick="quitarAnimalListaTxt('${itemLista.id}')"
          >
            Quitar
          </button>
        </div>
      </div>
    `;

    contenedor.appendChild(item);
  }

  actualizarContadoresTxt();
}

// Quita un animal de la lista.
function quitarAnimalListaTxt(id) {
  const lista = obtenerListaTxt();
  const nuevaLista = [];

  for (let i = 0; i < lista.length; i++) {
    if (lista[i].id !== id) {
      nuevaLista.push(lista[i]);
    }
  }

  guardarListaTxt(nuevaLista);
  mostrarListaTxt();
  actualizarVistaPreviaTxt();
}

// Limpia toda la lista.
function limpiarListaTxt() {
  const confirmar = confirm("¿Seguro que querés limpiar la lista preventiva?");

  if (!confirmar) return;

  guardarListaTxt([]);
  totalBloqueadosTxt = 0;

  mostrarListaTxt();
  actualizarVistaPreviaTxt();
  actualizarContadoresTxt();
  mostrarResultadoTxt("Lista preventiva limpiada correctamente.", "success");
}

// Actualiza contadores.
function actualizarContadoresTxt() {
  const lista = obtenerListaTxt();

  actualizarTextoTxt("totalAnimalesTxt", lista.length);
  actualizarTextoTxt("totalBloqueadosTxt", totalBloqueadosTxt);
}

// Genera vista previa del TXT.
function actualizarVistaPreviaTxt() {
  const textarea = document.getElementById("vistaPreviaTxt");

  if (!textarea) return;

  textarea.value = generarContenidoTxtPreventivo();
}

// Genera contenido TXT según el formato del ejemplo recibido.
function generarContenidoTxtPreventivo() {
  const lista = obtenerListaTxt();
  const numeroGuia = obtenerNumeroGuiaTxt();

  const lineas = [];

  for (let i = 0; i < lista.length; i++) {
    const item = lista[i];

    const identificador = obtenerIdentificadorParaTxt(item);
    const fecha = convertirFechaLecturaAFormatoTxt(item.fechaLectura);
    const hora = convertirHoraLecturaAFormatoTxt(item.horaLectura);

    const linea =
      "[|" +
      identificador +
      "|" +
      fecha +
      "|" +
      hora +
      "|" +
      numeroGuia +
      "|.|.|.|.|.|.|.|.|.|.|]";

    lineas.push(linea);
  }

  return lineas.join("\n");
}

// Descarga TXT preventivo.
function descargarTxtPreventivo() {
  const contenido = generarContenidoTxtPreventivo();

  if (contenido.trim() === "") {
    mostrarResultadoTxt("No hay animales agregados para descargar.", "warning");
    prepararInputTxt();
    return;
  }

  const blob = new Blob([contenido], {
    type: "text/plain;charset=utf-8"
  });

  const enlace = document.createElement("a");
  const fechaNombre = obtenerFechaNombreArchivoTxt();

  enlace.href = URL.createObjectURL(blob);
  enlace.download = "ruraldata_pre_txt_" + fechaNombre + ".txt";

  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(enlace.href);

  mostrarResultadoTxt("TXT preventivo descargado correctamente.", "success");
  prepararInputTxt();
}

// Obtiene identificador principal para el TXT.
function obtenerIdentificadorParaTxt(item) {
  if (item.caravanaOchoDigitos && item.caravanaOchoDigitos.length === 8) {
    return obtenerPrefijoUruguayTxt() + item.caravanaOchoDigitos;
  }

  const caravanaDesdeVisual = obtenerUltimosOchoDigitos(item.caravanaVisual);

  if (caravanaDesdeVisual) {
    return obtenerPrefijoUruguayTxt() + caravanaDesdeVisual;
  }

  const caravanaDesdeRFID = obtenerUltimosOchoDigitos(item.codigoRFID);

  if (caravanaDesdeRFID) {
    return obtenerPrefijoUruguayTxt() + caravanaDesdeRFID;
  }

  return "SIN_IDENTIFICADOR";
}

// Obtiene los 8 números de caravana desde el animal o desde lo ingresado.
function obtenerCaravanaOchoDigitosAnimal(animal, identificacionIngresada) {
  const desdeCaravanaVisual = obtenerUltimosOchoDigitos(animal.caravanaVisual);

  if (desdeCaravanaVisual) {
    return desdeCaravanaVisual;
  }

  const desdeRFID = obtenerUltimosOchoDigitos(animal.codigoRFID);

  if (desdeRFID) {
    return desdeRFID;
  }

  const desdeIngreso = obtenerUltimosOchoDigitos(identificacionIngresada);

  if (desdeIngreso) {
    return desdeIngreso;
  }

  return "";
}

// Obtiene los últimos 8 dígitos de un texto.
function obtenerUltimosOchoDigitos(valor) {
  if (!valor) return "";

  const soloNumeros = String(valor).replace(/\D/g, "");

  if (soloNumeros.length < 8) {
    return "";
  }

  return soloNumeros.slice(-8);
}

// Normaliza identificación para comparar.
function normalizarIdentificacionTxt(valor) {
  if (!valor) return "";

  return String(valor).trim().toUpperCase();
}

// Obtiene prefijo Uruguay.
function obtenerPrefijoUruguayTxt() {
  const prefijoUruguayTxt = document.getElementById("prefijoUruguayTxt");

  if (!prefijoUruguayTxt || prefijoUruguayTxt.value.trim() === "") {
    return "A00000008580000";
  }

  return prefijoUruguayTxt.value.trim();
}

// Obtiene número de guía de propiedad de tránsito.
function obtenerNumeroGuiaTxt() {
  const numeroGuiaTxt = document.getElementById("numeroGuiaTxt");

  if (!numeroGuiaTxt || numeroGuiaTxt.value.trim() === "") {
    return "SIN_GUIA";
  }

  return numeroGuiaTxt.value.trim().toUpperCase();
}

// Obtiene lista desde localStorage.
function obtenerListaTxt() {
  const datos = localStorage.getItem(obtenerClaveListaTxt());

  return datos ? JSON.parse(datos) : [];
}

// Guarda lista en localStorage.
function guardarListaTxt(lista) {
  localStorage.setItem(obtenerClaveListaTxt(), JSON.stringify(lista));
}

// Clave separada por establecimiento.
function obtenerClaveListaTxt() {
  return "ruraldata_txt_preventivo_" + obtenerEstablecimientoActivo();
}

// Obtiene carencias activas agrupadas por animal.
function obtenerCarenciasActivasPorAnimalTxt() {
  const registros = obtenerSanidad();
  const carenciasActivas = {};

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    if (!registro.fechaLiberacion) continue;

    const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia) > 0;

    if (!tieneCarencia) continue;

    const estado = obtenerEstadoCarenciaTxt(registro.fechaLiberacion);

    if (estado !== "En carencia") continue;

    const claveAnimal = obtenerClaveAnimalDesdeSanidadTxt(registro);

    if (!carenciasActivas[claveAnimal]) {
      carenciasActivas[claveAnimal] = registro;
      continue;
    }

    const fechaGuardada = obtenerFechaDesdeISOTxt(
      carenciasActivas[claveAnimal].fechaLiberacion
    );

    const fechaNueva = obtenerFechaDesdeISOTxt(registro.fechaLiberacion);

    if (fechaNueva > fechaGuardada) {
      carenciasActivas[claveAnimal] = registro;
    }
  }

  return carenciasActivas;
}

// Devuelve clave única de animal.
function obtenerClaveAnimalTxt(animal) {
  if (animal.id) return animal.id;
  if (animal.caravanaVisual) return animal.caravanaVisual;
  if (animal.codigoRFID) return animal.codigoRFID;

  return "animal_sin_id";
}

// Devuelve clave única desde sanidad.
function obtenerClaveAnimalDesdeSanidadTxt(registro) {
  if (registro.animalId) return registro.animalId;
  if (registro.caravanaVisual) return registro.caravanaVisual;
  if (registro.codigoRFID) return registro.codigoRFID;
  if (registro.identificacion) return registro.identificacion;

  return registro.id;
}

// Devuelve En carencia o Liberado.
function obtenerEstadoCarenciaTxt(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraTxt(new Date());
  const fecha = obtenerFechaDesdeISOTxt(fechaLiberacion);

  if (fecha > hoy) {
    return "En carencia";
  }

  return "Liberado";
}

// Calcula días restantes de carencia.
function calcularDiasRestantesTxt(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraTxt(new Date());
  const fecha = obtenerFechaDesdeISOTxt(fechaLiberacion);

  const diferencia = fecha.getTime() - hoy.getTime();
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

  if (dias < 0) return 0;

  return dias;
}

// Fecha actual para guardar lectura.
function obtenerFechaActualTxt() {
  const fecha = new Date();

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return anio + "-" + mes + "-" + dia;
}

// Hora actual para guardar lectura.
function obtenerHoraActualTxt() {
  const fecha = new Date();

  const hora = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  const segundos = String(fecha.getSeconds()).padStart(2, "0");

  return hora + ":" + minutos + ":" + segundos;
}

// Convierte yyyy-mm-dd a ddmmaaaa.
function convertirFechaLecturaAFormatoTxt(fechaISO) {
  const partes = fechaISO.split("-");

  if (partes.length !== 3) {
    return "";
  }

  return partes[2] + partes[1] + partes[0];
}

// Convierte hh:mm:ss a hhmmss.
function convertirHoraLecturaAFormatoTxt(hora) {
  return hora.replaceAll(":", "");
}

// Fecha para nombre del archivo.
function obtenerFechaNombreArchivoTxt() {
  const fecha = new Date();

  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  const hora = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");

  return anio + mes + dia + "_" + hora + minutos;
}

// Convierte yyyy-mm-dd a Date local.
function obtenerFechaDesdeISOTxt(fechaISO) {
  const partes = fechaISO.split("-");

  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  return new Date(anio, mes, dia);
}

// Quita hora.
function obtenerFechaSinHoraTxt(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );
}

// Formatea fecha.
function formatearFechaTxt(fechaISO) {
  if (!fechaISO) {
    return "Sin dato";
  }

  const partes = fechaISO.split("-");

  if (partes.length !== 3) {
    return fechaISO;
  }

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Actualiza texto por id.
function actualizarTextoTxt(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}

// Datos vivos de cabecera.
function inicializarDatosCabeceraTxt() {
  actualizarDatosCabeceraTxt();

  setInterval(function () {
    actualizarDatosCabeceraTxt();
  }, 1000);
}

function actualizarDatosCabeceraTxt() {
  const ahora = new Date();

  actualizarTextoTxt("infoDia", obtenerDiaTextoTxt(ahora));
  actualizarTextoTxt("infoHora", obtenerHoraTextoTxt(ahora));
  actualizarTextoTxt("infoLuna", obtenerFaseLunarTxt(ahora));

  const rotativo = document.getElementById("infoRotativaMobile");

  if (rotativo) {
    rotativo.textContent = "Pre TXT / SNIG";
  }
}

function obtenerDiaTextoTxt(fecha) {
  const opciones = {
    weekday: "long",
    day: "2-digit",
    month: "long"
  };

  let texto = fecha.toLocaleDateString("es-UY", opciones);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerHoraTextoTxt(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerFaseLunarTxt(fecha) {
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