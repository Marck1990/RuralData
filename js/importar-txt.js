// Importación de TXT de caravaneo para RuralData.
// Lee líneas del tipo:
// [|RFID_COMPLETO|DDMMAAAA|HHMMSS|NRO_GUIA|.|.|.|.|.|.|.|.|.|.|]
//
// También permite:
// - detectar si el mismo TXT ya fue procesado antes
// - detectar caravanas duplicadas dentro del mismo TXT
// - ingresar todos los animales no registrados
// - ingresar manualmente uno por uno
// - eliminar animales de la importación

let resultadoImportacionTxt = {
  lineas: [],
  encontrados: [],
  noRegistrados: [],
  enCarencia: [],
  duplicados: [],
  invalidos: []
};

document.addEventListener("DOMContentLoaded", function () {
  inicializarImportarTxt();
  inicializarDatosCabeceraImportarTxt();
});

function inicializarImportarTxt() {
  const btnProcesar = document.getElementById("btnProcesarTxtImportado");
  const btnTabEncontrados = document.getElementById("btnTabEncontradosImportar");
  const btnTabNoRegistrados = document.getElementById("btnTabNoRegistradosImportar");

  const btnNoIngresar = document.getElementById("btnNoIngresarAnimalesTxt");
  const btnIngresarTodos = document.getElementById("btnIngresarTodosAnimalesTxt");
  const btnIngresarManual = document.getElementById("btnIngresarManualAnimalesTxt");

  if (btnProcesar) {
    btnProcesar.addEventListener("click", procesarArchivoTxtImportado);
  }

  if (btnTabEncontrados) {
    btnTabEncontrados.addEventListener("click", function () {
      cambiarTabImportarTxt("encontrados");
    });
  }

  if (btnTabNoRegistrados) {
    btnTabNoRegistrados.addEventListener("click", function () {
      cambiarTabImportarTxt("noRegistrados");
    });
  }

  if (btnNoIngresar) {
    btnNoIngresar.addEventListener("click", ocultarPanelDecisionImportarTxt);
  }

  if (btnIngresarTodos) {
    btnIngresarTodos.addEventListener("click", ingresarTodosLosAnimalesTxt);
  }

  if (btnIngresarManual) {
    btnIngresarManual.addEventListener("click", activarIngresoManualTxt);
  }

  mostrarResultadosImportacionTxt();
  controlarPanelDecisionImportarTxt();
}

// Procesa el archivo seleccionado.
function procesarArchivoTxtImportado() {
  const inputArchivo = document.getElementById("archivoTxtImportado");

  if (!inputArchivo || !inputArchivo.files || inputArchivo.files.length === 0) {
    mostrarMensajeImportarTxt("Debe seleccionar un archivo TXT.", "warning");
    return;
  }

  const archivo = inputArchivo.files[0];

  if (!archivo.name.toLowerCase().endsWith(".txt")) {
    mostrarMensajeImportarTxt("El archivo debe ser .txt.", "danger");
    return;
  }

  const lector = new FileReader();

  lector.onload = function (evento) {
    const contenido = evento.target.result;
    const firmaArchivo = generarFirmaArchivoTxt(contenido);

    if (archivoYaFueProcesadoTxt(firmaArchivo)) {
      const confirmar = confirm(
        "Este TXT parece que ya fue procesado antes en este establecimiento. ¿Querés procesarlo nuevamente?"
      );

      if (!confirmar) {
        mostrarMensajeImportarTxt(
          "Importación cancelada para evitar duplicar datos.",
          "warning"
        );

        return;
      }
    }

    analizarContenidoTxtImportado(contenido, archivo.name, firmaArchivo);
  };

  lector.onerror = function () {
    mostrarMensajeImportarTxt("No se pudo leer el archivo.", "danger");
  };

  lector.readAsText(archivo);
}

// Analiza el contenido completo del TXT.
function analizarContenidoTxtImportado(contenido, nombreArchivo, firmaArchivo) {
  resultadoImportacionTxt = {
    lineas: [],
    encontrados: [],
    noRegistrados: [],
    enCarencia: [],
    duplicados: [],
    invalidos: []
  };

  const lineas = contenido.split(/\r?\n/);
  const carenciasActivas = obtenerCarenciasActivasImportarTxt();
  const caravanasLeidasEnEsteTxt = {};

  for (let i = 0; i < lineas.length; i++) {
    const lineaOriginal = lineas[i].trim();

    if (lineaOriginal.length === 0) continue;

    const registro = parsearLineaTxtImportada(lineaOriginal, i + 1);

    if (!registro) continue;

    if (!registro.caravanaOchoDigitos) {
      registro.estado = "Formato inválido";
      resultadoImportacionTxt.invalidos.push(registro);
      resultadoImportacionTxt.lineas.push(registro);
      continue;
    }

    if (caravanasLeidasEnEsteTxt[registro.caravanaOchoDigitos]) {
      registro.estado = "Duplicado en TXT";
      registro.encontrado = false;

      resultadoImportacionTxt.duplicados.push(registro);
      resultadoImportacionTxt.lineas.push(registro);

      continue;
    }

    caravanasLeidasEnEsteTxt[registro.caravanaOchoDigitos] = true;

    const animal = buscarAnimalImportado(
      registro.codigoCompleto,
      registro.caravanaOchoDigitos
    );

    if (animal) {
      const claveAnimal = obtenerClaveAnimalImportarTxt(animal);
      const carencia = carenciasActivas[claveAnimal];

      registro.animal = animal;
      registro.encontrado = true;

      if (carencia) {
        registro.estado = "En carencia";
        registro.carencia = carencia;

        resultadoImportacionTxt.enCarencia.push(registro);
      } else {
        registro.estado = "Registrado";
      }

      resultadoImportacionTxt.encontrados.push(registro);
    } else {
      registro.encontrado = false;
      registro.estado = "No registrado";

      resultadoImportacionTxt.noRegistrados.push(registro);
    }

    resultadoImportacionTxt.lineas.push(registro);
  }

  guardarArchivoProcesadoTxt(nombreArchivo, firmaArchivo, resultadoImportacionTxt.lineas.length);

  mostrarResultadosImportacionTxt();
  controlarPanelDecisionImportarTxt();

  let mensaje =
    "TXT procesado correctamente. Líneas leídas: " +
    resultadoImportacionTxt.lineas.length +
    ".";

  if (resultadoImportacionTxt.duplicados.length > 0) {
    mensaje += " Duplicados dentro del TXT: " + resultadoImportacionTxt.duplicados.length + ".";
  }

  if (resultadoImportacionTxt.invalidos.length > 0) {
    mensaje += " Líneas inválidas: " + resultadoImportacionTxt.invalidos.length + ".";
  }

  mostrarMensajeImportarTxt(mensaje, "success");
}

// Parsea una línea del TXT.
function parsearLineaTxtImportada(lineaOriginal, numeroLinea) {
  let linea = lineaOriginal.trim();

  if (linea.startsWith("[")) {
    linea = linea.substring(1);
  }

  if (linea.endsWith("]")) {
    linea = linea.substring(0, linea.length - 1);
  }

  if (linea.startsWith("|")) {
    linea = linea.substring(1);
  }

  if (linea.endsWith("|")) {
    linea = linea.substring(0, linea.length - 1);
  }

  const partes = linea.split("|");

  if (partes.length < 4) {
    return {
      id: crypto.randomUUID(),
      numeroLinea: numeroLinea,
      lineaOriginal: lineaOriginal,
      codigoCompleto: "",
      caravanaOchoDigitos: "",
      fechaLectura: "",
      horaLectura: "",
      numeroGuia: "",
      estado: "Formato inválido",
      encontrado: false,
      animal: null,
      carencia: null
    };
  }

  const codigoCompleto = partes[0].trim();
  const fechaTxt = partes[1].trim();
  const horaTxt = partes[2].trim();
  const numeroGuia = partes[3].trim();

  return {
    id: crypto.randomUUID(),
    numeroLinea: numeroLinea,
    lineaOriginal: lineaOriginal,
    codigoCompleto: codigoCompleto,
    caravanaOchoDigitos: obtenerUltimosOchoDigitosImportarTxt(codigoCompleto),
    fechaLectura: fechaTxt,
    horaLectura: horaTxt,
    numeroGuia: numeroGuia,
    fechaFormateada: formatearFechaImportadaTxt(fechaTxt),
    horaFormateada: formatearHoraImportadaTxt(horaTxt),
    estado: "Procesado",
    encontrado: false,
    animal: null,
    carencia: null
  };
}

// Muestra u oculta la pregunta de ingreso al registro.
function controlarPanelDecisionImportarTxt() {
  const panel = document.getElementById("panelDecisionImportarTxt");

  if (!panel) return;

  if (resultadoImportacionTxt.noRegistrados.length > 0) {
    panel.classList.remove("d-none");
  } else {
    panel.classList.add("d-none");
  }
}

// Oculta el panel de decisión.
function ocultarPanelDecisionImportarTxt() {
  const panel = document.getElementById("panelDecisionImportarTxt");

  if (!panel) return;

  panel.classList.add("d-none");

  mostrarMensajeImportarTxt(
    "No se ingresaron animales al registro. El TXT quedó solo como consulta.",
    "info"
  );
}

// Activa ingreso manual.
function activarIngresoManualTxt() {
  cambiarTabImportarTxt("noRegistrados");

  const tabNoRegistrados = document.getElementById("tabNoRegistradosImportar");

  if (tabNoRegistrados) {
    tabNoRegistrados.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  mostrarMensajeImportarTxt(
    "Ingreso manual activado. Usá los botones Agregar o Eliminar en cada animal no registrado.",
    "info"
  );
}

// Ingresa todos los animales no registrados al registro de RuralData.
function ingresarTodosLosAnimalesTxt() {
  if (resultadoImportacionTxt.noRegistrados.length === 0) {
    mostrarMensajeImportarTxt("No hay animales no registrados para ingresar.", "info");
    return;
  }

  const confirmar = confirm(
    "¿Seguro que querés ingresar todos los animales no registrados al registro de RuralData?"
  );

  if (!confirmar) return;

  let cantidadAgregados = 0;
  let cantidadOmitidos = 0;

  const copiaNoRegistrados = resultadoImportacionTxt.noRegistrados.slice();

  for (let i = 0; i < copiaNoRegistrados.length; i++) {
    const agregado = agregarAnimalImportadoAlRegistro(copiaNoRegistrados[i]);

    if (agregado) {
      cantidadAgregados++;
    } else {
      cantidadOmitidos++;
    }
  }

  mostrarResultadosImportacionTxt();
  controlarPanelDecisionImportarTxt();

  mostrarMensajeImportarTxt(
    "Se ingresaron " +
      cantidadAgregados +
      " animales. Omitidos por duplicado o error: " +
      cantidadOmitidos +
      ".",
    "success"
  );
}

// Agrega un animal individual desde el TXT.
function agregarAnimalIndividualTxt(idRegistro) {
  const registro = buscarRegistroNoRegistradoPorId(idRegistro);

  if (!registro) {
    mostrarMensajeImportarTxt("No se encontró el animal en la importación.", "warning");
    return;
  }

  const agregado = agregarAnimalImportadoAlRegistro(registro);

  if (!agregado) {
    mostrarMensajeImportarTxt(
      "No se pudo agregar. Es posible que esa caravana ya exista en el registro.",
      "warning"
    );

    return;
  }

  mostrarResultadosImportacionTxt();
  controlarPanelDecisionImportarTxt();

  mostrarMensajeImportarTxt(
    "Animal " + registro.caravanaOchoDigitos + " agregado al registro de RuralData.",
    "success"
  );
}

// Agrega el animal importado al arreglo real de animales.
function agregarAnimalImportadoAlRegistro(registro) {
  if (!registro || !registro.caravanaOchoDigitos) {
    return false;
  }

  const yaExiste = buscarAnimalImportado(
    registro.codigoCompleto,
    registro.caravanaOchoDigitos
  );

  if (yaExiste) {
    moverRegistroAEncontrados(registro, yaExiste);
    return false;
  }

  const animales = obtenerAnimales();

  if (existeCaravanaEnAnimales(animales, registro.caravanaOchoDigitos, registro.codigoCompleto)) {
    return false;
  }

  const nuevoAnimal = crearAnimalDesdeRegistroImportado(registro);

  animales.push(nuevoAnimal);
  guardarAnimales(animales);

  moverRegistroAEncontrados(registro, nuevoAnimal);

  return true;
}

// Revisión extra para evitar duplicar caravana o RFID.
function existeCaravanaEnAnimales(animales, caravanaOchoDigitos, codigoCompleto) {
  const codigoNormalizado = normalizarTextoImportarTxt(codigoCompleto);

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = animal.caravanaVisual || "";
    const codigoRFID = animal.codigoRFID || "";

    const caravanaVisualOcho = obtenerUltimosOchoDigitosImportarTxt(caravanaVisual);
    const codigoRFIDOcho = obtenerUltimosOchoDigitosImportarTxt(codigoRFID);
    const codigoRFIDNormalizado = normalizarTextoImportarTxt(codigoRFID);

    if (caravanaVisualOcho === caravanaOchoDigitos) {
      return true;
    }

    if (codigoRFIDOcho === caravanaOchoDigitos) {
      return true;
    }

    if (codigoRFIDNormalizado === codigoNormalizado) {
      return true;
    }
  }

  return false;
}

// Crea animal con datos mínimos desde el TXT.
function crearAnimalDesdeRegistroImportado(registro) {
  return {
    id: crypto.randomUUID(),

    caravanaVisual: registro.caravanaOchoDigitos || "",
    codigoRFID: registro.codigoCompleto || "",

    categoria: "Sin definir",
    sexo: "Sin definir",
    raza: "",
    fechaNacimiento: "",
    propietario: "",
    campo: "",

    origen: "Importado desde TXT",
    numeroGuiaImportacion: registro.numeroGuia || "",
    fechaLecturaTxt: registro.fechaLectura || "",
    horaLecturaTxt: registro.horaLectura || "",
    fechaRegistro: new Date().toISOString()
  };
}

// Mueve un registro desde no registrados a encontrados.
function moverRegistroAEncontrados(registro, animal) {
  quitarRegistroNoRegistradoDeMemoria(registro.id);

  registro.animal = animal;
  registro.encontrado = true;
  registro.estado = "Registrado";

  resultadoImportacionTxt.encontrados.push(registro);

  for (let i = 0; i < resultadoImportacionTxt.lineas.length; i++) {
    if (resultadoImportacionTxt.lineas[i].id === registro.id) {
      resultadoImportacionTxt.lineas[i] = registro;
      break;
    }
  }
}

// Elimina animal de esta importación.
function eliminarRegistroImportacionTxt(idRegistro) {
  const confirmar = confirm(
    "¿Seguro que querés eliminar este animal de la importación?"
  );

  if (!confirmar) return;

  quitarRegistroNoRegistradoDeMemoria(idRegistro);
  quitarRegistroDeLineasImportadas(idRegistro);

  mostrarResultadosImportacionTxt();
  controlarPanelDecisionImportarTxt();

  mostrarMensajeImportarTxt(
    "Animal eliminado de esta importación.",
    "success"
  );
}

// Busca registro no registrado.
function buscarRegistroNoRegistradoPorId(idRegistro) {
  for (let i = 0; i < resultadoImportacionTxt.noRegistrados.length; i++) {
    if (resultadoImportacionTxt.noRegistrados[i].id === idRegistro) {
      return resultadoImportacionTxt.noRegistrados[i];
    }
  }

  return null;
}

// Quita de no registrados.
function quitarRegistroNoRegistradoDeMemoria(idRegistro) {
  const nuevaLista = [];

  for (let i = 0; i < resultadoImportacionTxt.noRegistrados.length; i++) {
    if (resultadoImportacionTxt.noRegistrados[i].id !== idRegistro) {
      nuevaLista.push(resultadoImportacionTxt.noRegistrados[i]);
    }
  }

  resultadoImportacionTxt.noRegistrados = nuevaLista;
}

// Quita de líneas importadas.
function quitarRegistroDeLineasImportadas(idRegistro) {
  const nuevasLineas = [];

  for (let i = 0; i < resultadoImportacionTxt.lineas.length; i++) {
    if (resultadoImportacionTxt.lineas[i].id !== idRegistro) {
      nuevasLineas.push(resultadoImportacionTxt.lineas[i]);
    }
  }

  resultadoImportacionTxt.lineas = nuevasLineas;
}

// Busca un animal registrado por RFID completo o por los últimos 8 dígitos.
function buscarAnimalImportado(codigoCompleto, caravanaOchoDigitos) {
  const animales = obtenerAnimales();

  const codigoNormalizado = normalizarTextoImportarTxt(codigoCompleto);

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = animal.caravanaVisual ? animal.caravanaVisual.trim() : "";
    const codigoRFID = animal.codigoRFID ? animal.codigoRFID.trim() : "";

    const caravanaVisualNormalizada = normalizarTextoImportarTxt(caravanaVisual);
    const codigoRFIDNormalizado = normalizarTextoImportarTxt(codigoRFID);

    const caravanaVisualOcho = obtenerUltimosOchoDigitosImportarTxt(caravanaVisual);
    const codigoRFIDOcho = obtenerUltimosOchoDigitosImportarTxt(codigoRFID);

    if (
      codigoRFIDNormalizado === codigoNormalizado ||
      caravanaVisualNormalizada === codigoNormalizado ||
      codigoRFIDOcho === caravanaOchoDigitos ||
      caravanaVisualOcho === caravanaOchoDigitos
    ) {
      return animal;
    }
  }

  return null;
}

// Cambia entre pestañas.
function cambiarTabImportarTxt(tab) {
  const btnEncontrados = document.getElementById("btnTabEncontradosImportar");
  const btnNoRegistrados = document.getElementById("btnTabNoRegistradosImportar");

  const tabEncontrados = document.getElementById("tabEncontradosImportar");
  const tabNoRegistrados = document.getElementById("tabNoRegistradosImportar");

  if (!btnEncontrados || !btnNoRegistrados || !tabEncontrados || !tabNoRegistrados) {
    return;
  }

  if (tab === "encontrados") {
    btnEncontrados.classList.add("activo");
    btnNoRegistrados.classList.remove("activo");

    tabEncontrados.classList.remove("d-none");
    tabNoRegistrados.classList.add("d-none");
  }

  if (tab === "noRegistrados") {
    btnNoRegistrados.classList.add("activo");
    btnEncontrados.classList.remove("activo");

    tabNoRegistrados.classList.remove("d-none");
    tabEncontrados.classList.add("d-none");
  }
}

// Muestra todos los resultados procesados.
function mostrarResultadosImportacionTxt() {
  actualizarContadoresImportarTxt();
  mostrarListaEncontradosImportarTxt();
  mostrarListaNoRegistradosImportarTxt();
  actualizarVistaPreviaImportarTxt();
}

// Actualiza contadores.
function actualizarContadoresImportarTxt() {
  actualizarTextoImportarTxt("totalLineasImportadas", resultadoImportacionTxt.lineas.length);
  actualizarTextoImportarTxt("totalAnimalesEncontradosTxt", resultadoImportacionTxt.encontrados.length);
  actualizarTextoImportarTxt("totalAnimalesNoRegistradosTxt", resultadoImportacionTxt.noRegistrados.length);
  actualizarTextoImportarTxt("totalAnimalesEnCarenciaTxt", resultadoImportacionTxt.enCarencia.length);
}

// Muestra encontrados.
function mostrarListaEncontradosImportarTxt() {
  const contenedor = document.getElementById("listaEncontradosImportarTxt");

  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (resultadoImportacionTxt.encontrados.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        Todavía no hay animales encontrados.
      </div>
    `;
    return;
  }

  for (let i = 0; i < resultadoImportacionTxt.encontrados.length; i++) {
    const registro = resultadoImportacionTxt.encontrados[i];
    const animal = registro.animal;

    const tieneCarencia = registro.estado === "En carencia";
    const claseEstado = tieneCarencia ? "badge-soft-red" : "badge-soft-green";
    const textoEstado = tieneCarencia ? "En carencia" : "Registrado";

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <span class="estado-pill ${claseEstado} mb-3">
          ${textoEstado}
        </span>

        <h3 class="h5 mb-2">
          ${animal.caravanaVisual || registro.caravanaOchoDigitos || "Animal sin caravana"}
        </h3>

        <p class="mb-1">
          RFID TXT: ${registro.codigoCompleto || "Sin dato"}
        </p>

        <p class="mb-1">
          Caravana 8 dígitos: <strong>${registro.caravanaOchoDigitos || "Sin dato"}</strong>
        </p>

        <p class="mb-1">
          Fecha lectura: ${registro.fechaFormateada || "Sin dato"}
        </p>

        <p class="mb-1">
          Hora lectura: ${registro.horaFormateada || "Sin dato"}
        </p>

        <p class="mb-1">
          Guía: ${registro.numeroGuia || "Sin dato"}
        </p>

        ${
          tieneCarencia
            ? `
              <p class="mb-1">
                Producto: ${registro.carencia.producto || "Sin dato"}
              </p>

              <p class="mb-0">
                Liberación sanitaria: <strong>${formatearFechaImportarTxt(registro.carencia.fechaLiberacion)}</strong>
              </p>
            `
            : `
              <p class="mb-0">
                Sin carencia sanitaria vigente registrada.
              </p>
            `
        }
      </div>
    `;

    contenedor.appendChild(item);
  }
}

// Muestra no registrados con botones Agregar / Eliminar.
function mostrarListaNoRegistradosImportarTxt() {
  const contenedor = document.getElementById("listaNoRegistradosImportarTxt");

  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (resultadoImportacionTxt.noRegistrados.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-success mb-0">
        No hay animales no registrados para ingresar.
      </div>
    `;
    return;
  }

  for (let i = 0; i < resultadoImportacionTxt.noRegistrados.length; i++) {
    const registro = resultadoImportacionTxt.noRegistrados[i];

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <span class="estado-pill badge-soft-yellow mb-3">
          No registrado
        </span>

        <h3 class="h5 mb-2">
          ${registro.caravanaOchoDigitos || "Sin caravana"}
        </h3>

        <p class="mb-1">
          RFID TXT: ${registro.codigoCompleto || "Sin dato"}
        </p>

        <p class="mb-1">
          Línea: ${registro.numeroLinea}
        </p>

        <p class="mb-1">
          Fecha lectura: ${registro.fechaFormateada || "Sin dato"}
        </p>

        <p class="mb-1">
          Hora lectura: ${registro.horaFormateada || "Sin dato"}
        </p>

        <p class="mb-3">
          Guía: ${registro.numeroGuia || "Sin dato"}
        </p>

        <div class="d-grid gap-2 d-md-flex">
          <button
            type="button"
            class="btn btn-success"
            onclick="agregarAnimalIndividualTxt('${registro.id}')"
          >
            Agregar
          </button>

          <button
            type="button"
            class="btn btn-outline-danger"
            onclick="eliminarRegistroImportacionTxt('${registro.id}')"
          >
            Eliminar
          </button>
        </div>
      </div>
    `;

    contenedor.appendChild(item);
  }
}

// Actualiza vista previa.
function actualizarVistaPreviaImportarTxt() {
  const textarea = document.getElementById("vistaPreviaImportarTxt");

  if (!textarea) return;

  if (resultadoImportacionTxt.lineas.length === 0) {
    textarea.value = "";
    return;
  }

  const lineas = [];

  for (let i = 0; i < resultadoImportacionTxt.lineas.length; i++) {
    const registro = resultadoImportacionTxt.lineas[i];

    lineas.push(
      "Línea " + registro.numeroLinea +
      " | Caravana: " + (registro.caravanaOchoDigitos || "Sin dato") +
      " | Fecha: " + (registro.fechaFormateada || "Sin dato") +
      " | Hora: " + (registro.horaFormateada || "Sin dato") +
      " | Guía: " + (registro.numeroGuia || "Sin dato") +
      " | Estado: " + registro.estado
    );
  }

  textarea.value = lineas.join("\n");
}

// Guarda firma de TXT procesado.
function guardarArchivoProcesadoTxt(nombreArchivo, firmaArchivo, cantidadLineas) {
  if (!firmaArchivo) return;

  const historial = obtenerArchivosProcesadosTxt();

  if (archivoYaFueProcesadoTxt(firmaArchivo)) {
    return;
  }

  const registro = {
    id: crypto.randomUUID(),
    nombreArchivo: nombreArchivo || "archivo_txt",
    firmaArchivo: firmaArchivo,
    cantidadLineas: cantidadLineas,
    fechaProcesado: new Date().toISOString()
  };

  historial.unshift(registro);

  guardarArchivosProcesadosTxt(historial);
}

// Verifica si un TXT ya fue procesado.
function archivoYaFueProcesadoTxt(firmaArchivo) {
  const historial = obtenerArchivosProcesadosTxt();

  for (let i = 0; i < historial.length; i++) {
    if (historial[i].firmaArchivo === firmaArchivo) {
      return true;
    }
  }

  return false;
}

// Obtiene historial simple de archivos procesados.
function obtenerArchivosProcesadosTxt() {
  const datos = localStorage.getItem(obtenerClaveArchivosProcesadosTxt());

  return datos ? JSON.parse(datos) : [];
}

// Guarda historial simple de archivos procesados.
function guardarArchivosProcesadosTxt(historial) {
  localStorage.setItem(obtenerClaveArchivosProcesadosTxt(), JSON.stringify(historial));
}

// Clave separada por establecimiento.
function obtenerClaveArchivosProcesadosTxt() {
  return "ruraldata_archivos_txt_procesados_" + obtenerEstablecimientoActivo();
}

// Genera firma simple del contenido del archivo.
function generarFirmaArchivoTxt(contenido) {
  const texto = normalizarContenidoParaFirmaTxt(contenido);

  let hash = 0;

  if (texto.length === 0) {
    return "archivo_vacio";
  }

  for (let i = 0; i < texto.length; i++) {
    const caracter = texto.charCodeAt(i);

    hash = ((hash << 5) - hash) + caracter;
    hash = hash & hash;
  }

  return "txt_" + Math.abs(hash) + "_" + texto.length;
}

// Normaliza el contenido para comparar archivos.
function normalizarContenidoParaFirmaTxt(contenido) {
  if (!contenido) return "";

  return String(contenido)
    .replace(/\r/g, "")
    .trim()
    .toUpperCase();
}

// Obtiene carencias activas agrupadas por animal.
function obtenerCarenciasActivasImportarTxt() {
  const registros = obtenerSanidad();
  const carenciasActivas = {};

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    if (!registro.fechaLiberacion) continue;

    const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia) > 0;

    if (!tieneCarencia) continue;

    const estado = obtenerEstadoCarenciaImportarTxt(registro.fechaLiberacion);

    if (estado !== "En carencia") continue;

    const claveAnimal = obtenerClaveAnimalDesdeSanidadImportarTxt(registro);

    if (!carenciasActivas[claveAnimal]) {
      carenciasActivas[claveAnimal] = registro;
      continue;
    }

    const fechaGuardada = obtenerFechaDesdeISOImportarTxt(
      carenciasActivas[claveAnimal].fechaLiberacion
    );

    const fechaNueva = obtenerFechaDesdeISOImportarTxt(registro.fechaLiberacion);

    if (fechaNueva > fechaGuardada) {
      carenciasActivas[claveAnimal] = registro;
    }
  }

  return carenciasActivas;
}

// Devuelve clave única del animal.
function obtenerClaveAnimalImportarTxt(animal) {
  if (animal.id) return animal.id;
  if (animal.caravanaVisual) return animal.caravanaVisual;
  if (animal.codigoRFID) return animal.codigoRFID;

  return "animal_sin_id";
}

// Devuelve clave única desde sanidad.
function obtenerClaveAnimalDesdeSanidadImportarTxt(registro) {
  if (registro.animalId) return registro.animalId;
  if (registro.caravanaVisual) return registro.caravanaVisual;
  if (registro.codigoRFID) return registro.codigoRFID;
  if (registro.identificacion) return registro.identificacion;

  return registro.id;
}

// Devuelve En carencia o Liberado.
function obtenerEstadoCarenciaImportarTxt(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraImportarTxt(new Date());
  const fecha = obtenerFechaDesdeISOImportarTxt(fechaLiberacion);

  if (fecha > hoy) {
    return "En carencia";
  }

  return "Liberado";
}

// Obtiene últimos 8 dígitos.
function obtenerUltimosOchoDigitosImportarTxt(valor) {
  if (!valor) return "";

  const soloNumeros = String(valor).replace(/\D/g, "");

  if (soloNumeros.length < 8) {
    return "";
  }

  return soloNumeros.slice(-8);
}

// Normaliza texto.
function normalizarTextoImportarTxt(valor) {
  if (!valor) return "";

  return String(valor).trim().toUpperCase();
}

// Formatea fecha DDMMAAAA a DD/MM/AAAA.
function formatearFechaImportadaTxt(fechaTxt) {
  if (!fechaTxt || fechaTxt.length !== 8) {
    return fechaTxt;
  }

  const dia = fechaTxt.substring(0, 2);
  const mes = fechaTxt.substring(2, 4);
  const anio = fechaTxt.substring(4, 8);

  return dia + "/" + mes + "/" + anio;
}

// Formatea hora HHMMSS a HH:MM:SS.
function formatearHoraImportadaTxt(horaTxt) {
  if (!horaTxt || horaTxt.length !== 6) {
    return horaTxt;
  }

  const hora = horaTxt.substring(0, 2);
  const minutos = horaTxt.substring(2, 4);
  const segundos = horaTxt.substring(4, 6);

  return hora + ":" + minutos + ":" + segundos;
}

// Convierte yyyy-mm-dd a Date local.
function obtenerFechaDesdeISOImportarTxt(fechaISO) {
  const partes = fechaISO.split("-");

  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  return new Date(anio, mes, dia);
}

// Quita hora.
function obtenerFechaSinHoraImportarTxt(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );
}

// Formatea yyyy-mm-dd a dd/mm/yyyy.
function formatearFechaImportarTxt(fechaISO) {
  if (!fechaISO) return "Sin dato";

  const partes = fechaISO.split("-");

  if (partes.length !== 3) return fechaISO;

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Muestra mensaje.
function mostrarMensajeImportarTxt(texto, tipo) {
  const mensaje = document.getElementById("mensajeImportarTxt");

  if (!mensaje) return;

  mensaje.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${texto}
    </div>
  `;
}

// Actualiza texto por id.
function actualizarTextoImportarTxt(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}

// Datos vivos de cabecera.
function inicializarDatosCabeceraImportarTxt() {
  actualizarDatosCabeceraImportarTxt();

  setInterval(function () {
    actualizarDatosCabeceraImportarTxt();
  }, 1000);
}

function actualizarDatosCabeceraImportarTxt() {
  const ahora = new Date();

  actualizarTextoImportarTxt("infoDia", obtenerDiaTextoImportarTxt(ahora));
  actualizarTextoImportarTxt("infoHora", obtenerHoraTextoImportarTxt(ahora));
  actualizarTextoImportarTxt("infoLuna", obtenerFaseLunarImportarTxt(ahora));

  const rotativo = document.getElementById("infoRotativaMobile");

  if (rotativo) {
    rotativo.textContent = "Importar TXT";
  }
}

function obtenerDiaTextoImportarTxt(fecha) {
  const opciones = {
    weekday: "long",
    day: "2-digit",
    month: "long"
  };

  let texto = fecha.toLocaleDateString("es-UY", opciones);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerHoraTextoImportarTxt(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerFaseLunarImportarTxt(fecha) {
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