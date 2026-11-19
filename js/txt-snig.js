// Pre TXT / SNIG de RuralData.
// Arma una lista preventiva, bloquea animales con carencia sanitaria vigente
// y guarda historial local de TXT generados.
// Estructura basada en el ejemplo recibido:
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
  const btnLimpiarHistorialTxt = document.getElementById("btnLimpiarHistorialTxt");
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

  if (btnLimpiarHistorialTxt) {
    btnLimpiarHistorialTxt.addEventListener("click", limpiarHistorialTxt);
  }

  if (numeroGuiaTxt) {
    numeroGuiaTxt.addEventListener("input", function () {
      actualizarVistaPreviaTxt();
    });
  }

  if (inputIdentificacion) {
    inputIdentificacion.focus();
  }

  const mostrarEstadoTxt = () => {
    mostrarListaTxt();
    actualizarVistaPreviaTxt();
  };
  if (window.RuralDataMvp) mostrarEstadoTxt();
  else document.addEventListener("ruraldata:lista", mostrarEstadoTxt, { once: true });
  document.addEventListener("ruraldata:datos", mostrarEstadoTxt);
  mostrarHistorialTxt();
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

  const coincidencias = buscarCoincidenciasTxt(identificacion);
  if (coincidencias.length > 1) {
    mostrarResultadoTxt(MOTIVO_IDENTIDAD_SANITARIA, "danger");
    prepararInputTxt();
    return;
  }
  const [animal] = coincidencias;

  if (!animal) {
    mostrarResultadoTxt(
      "No se encontró un animal registrado con esa caravana o RFID.",
      "warning"
    );
    prepararInputTxt();
    return;
  }

  const animales = obtenerAnimales();
  const carencia = obtenerBloqueosSanitariosMvp(animales)[animal.id];

  if (carencia) {
    totalBloqueadosTxt++;
    mostrarResultadoBloqueadoTxt(animal, carencia);
    actualizarContadoresTxt();
    prepararInputTxt();
    return;
  }

  const caravanaOchoDigitos = obtenerCaravanaOchoDigitosAnimal(animal, identificacion);
  const motivoCaravana = validarCaravanaTxt(caravanaOchoDigitos, animales);
  if (motivoCaravana) {
    mostrarResultadoTxt(motivoCaravana, "danger");
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
function buscarCoincidenciasTxt(identificacion) {
  const sufijo = obtenerUltimosOchoDigitos(identificacion);
  return buscarCoincidenciasIdentificacionSanitaria(identificacion, obtenerAnimales(), animal =>
    sufijo && [animal.codigoRFID, animal.caravanaVisual].some(valor => obtenerUltimosOchoDigitos(valor) === sufijo)
  );
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
        Caravana: <strong>${escaparTextoMvp(animal.caravanaVisual || caravanaOchoDigitos)}</strong>
      </p>

      <p class="mb-1">
        Caravana TXT: <strong>${obtenerPrefijoUruguayTxt() + caravanaOchoDigitos}</strong>
      </p>

      <p class="mb-1">
        RFID: ${escaparTextoMvp(animal.codigoRFID || "Sin dato")}
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

  if (carencia.motivoPreventivo) {
    mostrarResultadoTxt("Animal bloqueado. " + carencia.motivoPreventivo, "danger");
    return;
  }
  const diasRestantes = calcularDiasRestantesTxt(carencia.fechaLiberacion);

  resultado.innerHTML = `
    <div class="alert alert-danger mb-0">
      <h3 class="h5 mb-2">
        Animal bloqueado
      </h3>

      <p class="mb-1">
        Caravana: <strong>${escaparTextoMvp(animal.caravanaVisual || "Sin dato")}</strong>
      </p>

      <p class="mb-1">
        RFID: ${escaparTextoMvp(animal.codigoRFID || "Sin dato")}
      </p>

      <p class="mb-1">
        Producto: ${escaparTextoMvp(carencia.producto || "Sin dato")}
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
      ${escaparTextoMvp(texto)}
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

  const animales = obtenerAnimales();
  const bloqueos = obtenerBloqueosSanitariosMvp(animales);
  for (const itemLista of lista) {
    const { motivo } = revisarItemTxt(itemLista, animales, bloqueos);
    const apto = !motivo;

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <span class="estado-pill ${apto ? 'badge-soft-green' : 'badge-soft-yellow'} mb-3">
              ${apto ? 'Agregado' : 'Bloqueado al exportar'}
            </span>
            ${motivo ? `<p class="text-danger">${escaparTextoMvp(motivo)}</p>` : ""}

            <h3 class="h5 mb-2">
              ${escaparTextoMvp(itemLista.caravanaVisual || itemLista.caravanaOchoDigitos || "Animal sin caravana")}
            </h3>

            <p class="mb-1">
              Caravana TXT: ${obtenerIdentificadorParaTxt(itemLista)}
            </p>

            <p class="mb-1">
              RFID: ${escaparTextoMvp(itemLista.codigoRFID || "Sin dato")}
            </p>

            <p class="mb-1">
              Categoría: ${escaparTextoMvp(itemLista.categoria || "Sin dato")}
            </p>

            <p class="mb-0">
              Lectura: ${escaparTextoMvp(itemLista.fechaLectura)} ${escaparTextoMvp(itemLista.horaLectura)}
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            onclick="quitarAnimalListaTxt(${argumentoEventoMvp(itemLista.id)})"
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
function obtenerListaTxtAptaActual(lista = obtenerListaTxt()) {
  const animales = obtenerAnimales();
  const bloqueos = obtenerBloqueosSanitariosMvp(animales);
  return lista.map(item => revisarItemTxt(item, animales, bloqueos).itemApto).filter(Boolean);
}

function revisarItemTxt(item, animales, bloqueos) {
  const referencia = item.animalId ? { animalId: item.animalId } : item;
  const { animal, candidatos } = resolverAsociacionSanitaria(referencia, animales);
  if (!animal) {
    return { motivo: candidatos.length ? MOTIVO_IDENTIDAD_SANITARIA : "Animal no registrado en RuralData." };
  }
  const carencia = bloqueos[animal.id];
  if (carencia) {
    return { motivo: carencia.motivoPreventivo || "Carencia sanitaria vigente hasta " + formatearFechaTxt(carencia.fechaLiberacion) };
  }
  const caravana = obtenerCaravanaOchoDigitosAnimal(animal, animal.caravanaVisual || animal.codigoRFID);
  const motivo = validarCaravanaTxt(caravana, animales);
  return motivo ? { motivo } : {
    itemApto: {...item, caravanaVisual: animal.caravanaVisual || "", codigoRFID: animal.codigoRFID || "", caravanaOchoDigitos: caravana}
  };
}

function validarCaravanaTxt(caravana, animales) {
  if (!caravana) return "No se pudo obtener una caravana válida de 8 números para generar el TXT.";
  const coincidencias = animales.filter(animal => obtenerCaravanaOchoDigitosAnimal(animal, "") === caravana);
  if (coincidencias.length > 1) return "La caravana de 8 dígitos identifica a más de un animal. Verificá los datos antes de generar el TXT.";
  return "";
}

function generarContenidoTxtPreventivo() {
  const lista = obtenerListaTxtAptaActual();
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

// Descarga TXT preventivo y guarda historial.
function descargarTxtPreventivo() {
  const contenido = generarContenidoTxtPreventivo();
  const lista = obtenerListaTxtAptaActual();

  if (contenido.trim() === "") {
    mostrarResultadoTxt("No hay animales aptos para descargar. Revisá el registro y las carencias actuales.", "warning");
    prepararInputTxt();
    return;
  }

  const nombreArchivo = generarNombreArchivoTxt();

  descargarContenidoTxt(contenido, nombreArchivo);

  guardarHistorialTxtGenerado(contenido, nombreArchivo, lista.length);
  mostrarHistorialTxt();

  mostrarResultadoTxt("TXT preventivo descargado y guardado en historial.", "success");
  prepararInputTxt();
}

// Descarga un contenido TXT.
function descargarContenidoTxt(contenido, nombreArchivo) {
  const blob = new Blob([contenido], {
    type: "text/plain;charset=utf-8"
  });

  const enlace = document.createElement("a");

  enlace.href = URL.createObjectURL(blob);
  enlace.download = nombreArchivo;

  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  URL.revokeObjectURL(enlace.href);
}

// Genera nombre del archivo.
function generarNombreArchivoTxt() {
  const fechaNombre = obtenerFechaNombreArchivoTxt();

  return "ruraldata_pre_txt_" + fechaNombre + ".txt";
}

// Guarda historial de TXT generado.
function guardarHistorialTxtGenerado(contenido, nombreArchivo, cantidadAnimales) {
  const historial = obtenerHistorialTxt();

  const nuevoRegistro = {
    id: crypto.randomUUID(),
    nombreArchivo: nombreArchivo,
    numeroGuia: obtenerNumeroGuiaTxt(),
    cantidadAnimales: cantidadAnimales,
    fechaGeneracion: obtenerFechaActualTxt(),
    horaGeneracion: obtenerHoraActualTxt(),
    contenido: contenido,
    fechaRegistro: new Date().toISOString()
  };

  historial.unshift(nuevoRegistro);

  guardarHistorialTxt(historial);
}

// Muestra historial de TXT generados.
function mostrarHistorialTxt() {
  const contenedor = document.getElementById("historialTxtGenerados");

  if (!contenedor) return;

  const historial = obtenerHistorialTxt();

  contenedor.innerHTML = "";

  if (historial.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        Todavía no hay TXT generados en el historial.
      </div>
    `;
    return;
  }

  for (let i = 0; i < historial.length; i++) {
    const registro = historial[i];

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <span class="estado-pill badge-soft-yellow mb-3">
              TXT generado
            </span>

            <h3 class="h5 mb-2">
              ${escaparHTML(registro.nombreArchivo)}
            </h3>

            <p class="mb-1">
              Guía: <strong>${escaparHTML(registro.numeroGuia)}</strong>
            </p>

            <p class="mb-1">
              Animales: ${escaparTextoMvp(registro.cantidadAnimales)}
            </p>

            <p class="mb-0">
              Generado: ${formatearFechaTxt(registro.fechaGeneracion)} ${escaparTextoMvp(registro.horaGeneracion)}
            </p>
          </div>

          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            onclick="eliminarRegistroHistorialTxt(${argumentoEventoMvp(registro.id)})"
          >
            Eliminar
          </button>
        </div>

        <textarea
          class="form-control mb-3"
          rows="4"
          readonly
        >${escaparHTML(registro.contenido)}</textarea>

        <button
          type="button"
          class="btn btn-success w-100"
          onclick="descargarTxtDesdeHistorial(${argumentoEventoMvp(registro.id)})"
        >
          Descargar nuevamente
        </button>
      </div>
    `;

    contenedor.appendChild(item);
  }
}

// Descarga nuevamente un TXT desde historial.
function descargarTxtDesdeHistorial(id) {
  const historial = obtenerHistorialTxt();

  for (let i = 0; i < historial.length; i++) {
    if (historial[i].id === id) {
      descargarContenidoTxt(historial[i].contenido, historial[i].nombreArchivo);
      mostrarResultadoTxt("TXT descargado nuevamente desde el historial.", "success");
      prepararInputTxt();
      return;
    }
  }

  mostrarResultadoTxt("No se encontró ese TXT en el historial.", "warning");
}

// Elimina un registro del historial.
function eliminarRegistroHistorialTxt(id) {
  const confirmar = confirm("¿Seguro que querés eliminar este TXT del historial?");

  if (!confirmar) return;

  const historial = obtenerHistorialTxt();
  const nuevoHistorial = [];

  for (let i = 0; i < historial.length; i++) {
    if (historial[i].id !== id) {
      nuevoHistorial.push(historial[i]);
    }
  }

  guardarHistorialTxt(nuevoHistorial);
  mostrarHistorialTxt();
}

// Limpia historial completo.
function limpiarHistorialTxt() {
  const confirmar = confirm("¿Seguro que querés limpiar todo el historial de TXT generados?");

  if (!confirmar) return;

  guardarHistorialTxt([]);
  mostrarHistorialTxt();
  mostrarResultadoTxt("Historial de TXT limpiado correctamente.", "success");
}

// Obtiene historial.
function obtenerHistorialTxt() {
  const datos = localStorage.getItem(obtenerClaveHistorialTxt());

  return datos ? JSON.parse(datos) : [];
}

// Guarda historial.
function guardarHistorialTxt(historial) {
  asegurarEscrituraLocalMvp();
  localStorage.setItem(obtenerClaveHistorialTxt(), JSON.stringify(historial));
}

// Clave separada por establecimiento para historial.
function obtenerClaveHistorialTxt() {
  return "ruraldata_historial_txt_" + obtenerEstablecimientoActivo();
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
  asegurarEscrituraLocalMvp();
  localStorage.setItem(obtenerClaveListaTxt(), JSON.stringify(lista));
}

// Clave separada por establecimiento.
function obtenerClaveListaTxt() {
  return "ruraldata_txt_preventivo_" + obtenerEstablecimientoActivo();
}

// Obtiene carencias activas agrupadas por animal.
function obtenerCarenciasActivasPorAnimalTxt() {
  return obtenerBloqueosSanitariosMvp();
}

// Devuelve clave única de animal.
function obtenerClaveAnimalTxt(animal) {
  if (animal.id) return animal.id;
  if (animal.caravanaVisual) return animal.caravanaVisual;
  if (animal.codigoRFID) return animal.codigoRFID;

  return "animal_sin_id";
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

// Evita problemas al mostrar texto dentro del HTML.
function escaparHTML(texto) {
  if (!texto) return "";

  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
