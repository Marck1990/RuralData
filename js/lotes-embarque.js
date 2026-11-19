// Lotes de embarque RuralData.
// Permite crear lotes, cargar animales por caravana/RFID,
// controlar aptitud por carencia y exportar TXT preventivo.

let loteEmbarqueActivoId = null;

document.addEventListener("DOMContentLoaded", function () {
    inicializarLotesEmbarque();
});

function inicializarLotesEmbarque() {
    const formCrearLote = document.getElementById("formCrearLoteEmbarque");
    const formAgregarAnimal = document.getElementById("formAgregarAnimalLoteEmbarque");
    const btnExportarTxt = document.getElementById("btnExportarTxtLoteEmbarque");
    const btnCerrarLote = document.getElementById("btnCerrarLoteEmbarque");
    const btnEliminarLote = document.getElementById("btnEliminarLoteEmbarque");
    const btnCargarTxt = document.getElementById("btnCargarTxtLoteEmbarque");
    const inputFecha = document.getElementById("fechaLoteEmbarque");

    if (inputFecha) {
        inputFecha.value = obtenerFechaHoyLoteEmbarque();
    }

    if (formCrearLote) {
        formCrearLote.addEventListener("submit", function (event) {
            event.preventDefault();
            crearLoteEmbarque();
        });
    }

    if (formAgregarAnimal) {
        formAgregarAnimal.addEventListener("submit", function (event) {
            event.preventDefault();
            agregarAnimalAlLoteEmbarque();
        });
    }

    if (btnExportarTxt) {
        btnExportarTxt.addEventListener("click", function () {
            exportarTxtLoteEmbarque();
        });
    }

    if (btnCerrarLote) {
        btnCerrarLote.addEventListener("click", function () {
            cerrarLoteEmbarqueActivo();
        });
    }

    if (btnEliminarLote) {
        btnEliminarLote.addEventListener("click", function () {
            eliminarLoteEmbarqueActivo();
        });
    }


    if (btnCargarTxt) {
        btnCargarTxt.addEventListener("click", function () {
            cargarTxtEnLoteEmbarque();
        });
    }

    document.addEventListener("ruraldata:lista", mostrarLotesEmbarque, { once: true });
    document.addEventListener("ruraldata:datos", () => {
        mostrarLotesEmbarque();
        if (loteEmbarqueActivoId) mostrarAnimalesLoteEmbarque();
    });
    if (window.RuralDataMvp) mostrarLotesEmbarque();
}

// Crea un lote nuevo.
function crearLoteEmbarque() {
    const inputNombre = document.getElementById("nombreLoteEmbarque");
    const inputFecha = document.getElementById("fechaLoteEmbarque");
    const inputDestino = document.getElementById("destinoLoteEmbarque");
    const inputTransportista = document.getElementById("transportistaLoteEmbarque");
    const inputMatricula = document.getElementById("matriculaLoteEmbarque");
    const inputGuia = document.getElementById("guiaLoteEmbarque");

    if (!inputNombre || !inputFecha) return;

    const nombre = inputNombre.value.trim();
    const fecha = inputFecha.value;

    if (nombre === "") {
        mostrarMensajeLotesEmbarque("Ingresá un nombre para el lote.", "warning");
        return;
    }

    if (fecha === "") {
        mostrarMensajeLotesEmbarque("Ingresá una fecha para el lote.", "warning");
        return;
    }

    const lote = {
        id: crearIdLoteEmbarque(),
        nombre: nombre,
        fecha: fecha,
        destino: inputDestino ? inputDestino.value.trim() : "",
        transportista: inputTransportista ? inputTransportista.value.trim() : "",
        matriculaCamion: inputMatricula ? inputMatricula.value.trim() : "",
        numeroGuia: inputGuia ? inputGuia.value.trim() : "",
        estado: "abierto",
        fechaRegistro: new Date().toISOString()
    };

    const lotes = obtenerLotesEmbarque();
    lotes.push(lote);
    guardarLotesEmbarque(lotes);

    loteEmbarqueActivoId = lote.id;

    inputNombre.value = "";
    if (inputDestino) inputDestino.value = "";
    if (inputTransportista) inputTransportista.value = "";
    if (inputMatricula) inputMatricula.value = "";
    if (inputGuia) inputGuia.value = "";
    inputFecha.value = obtenerFechaHoyLoteEmbarque();

    mostrarMensajeLotesEmbarque("Lote creado correctamente.", "success");
    mostrarLotesEmbarque();
    mostrarPanelLoteEmbarqueActivo();
}

// Muestra lotes guardados.
function mostrarLotesEmbarque() {
    const contenedor = document.getElementById("listaLotesEmbarque");

    if (!contenedor) return;

    const lotes = obtenerLotesEmbarque();

    contenedor.innerHTML = "";

    if (lotes.length === 0) {
        contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        Todavía no hay lotes de embarque creados.
      </div>
    `;
        return;
    }

    const lotesOrdenados = lotes.slice().sort(function (a, b) {
        const fechaA = a.fechaRegistro || a.fecha || "";
        const fechaB = b.fechaRegistro || b.fecha || "";

        if (fechaA < fechaB) return 1;
        if (fechaA > fechaB) return -1;

        return 0;
    });

    for (let i = 0; i < lotesOrdenados.length; i++) {
        const lote = lotesOrdenados[i];
        const resumen = obtenerResumenLoteEmbarque(lote.id);
        const claseEstado = lote.estado === "cerrado" ? "badge-soft-yellow" : "badge-soft-green";
        const textoEstado = lote.estado === "cerrado" ? "Cerrado" : "Abierto";

        const item = document.createElement("article");
        item.className = "card";

        item.innerHTML = `
      <div class="card-body p-3">
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div>
            <span class="estado-pill ${claseEstado} mb-2">
              ${textoEstado}
            </span>

            <h3 class="h6 mb-1">
              ${escaparHTMLLoteEmbarque(lote.nombre)}
            </h3>

            <p class="mb-1">
              ${formatearFechaLoteEmbarque(lote.fecha)}
              ${lote.destino ? " · " + escaparHTMLLoteEmbarque(lote.destino) : ""}
            </p>

            <small class="text-muted">
              Total: ${resumen.total} · Aptos: ${resumen.aptos} · No aptos: ${resumen.noAptos}
            </small>
          </div>

          <button
  type="button"
  class="btn btn-outline-success btn-sm"
  onclick="seleccionarLoteEmbarque('${lote.id}')"
>
  <i class="bi bi-folder2-open"></i>
  Abrir
</button>
        </div>
      </div>
    `;

        contenedor.appendChild(item);
    }
}

// Selecciona un lote.
function seleccionarLoteEmbarque(idLote) {
    loteEmbarqueActivoId = idLote;

    mostrarPanelLoteEmbarqueActivo();
}

// Muestra panel del lote activo.
function mostrarPanelLoteEmbarqueActivo() {
    const panel = document.getElementById("panelTrabajoLoteEmbarque");

    if (!panel) return;

    const lote = obtenerLoteEmbarquePorId(loteEmbarqueActivoId);

    if (!lote) {
        panel.classList.add("d-none");
        return;
    }

    panel.classList.remove("d-none");

    actualizarTextoLoteEmbarque("tituloLoteActivoEmbarque", lote.nombre);

    const detalle = [
        formatearFechaLoteEmbarque(lote.fecha),
        lote.destino || "",
        lote.numeroGuia ? "Guía: " + lote.numeroGuia : ""
    ].filter(function (item) {
        return item !== "";
    }).join(" · ");

    actualizarTextoLoteEmbarque(
        "detalleLoteActivoEmbarque",
        detalle || "Cargá animales leyendo caravana o RFID."
    );

    const estado = document.getElementById("estadoLoteActivoEmbarque");

    if (estado) {
        estado.textContent = lote.estado === "cerrado" ? "Cerrado" : "Abierto";
        estado.className = lote.estado === "cerrado"
            ? "estado-pill badge-soft-yellow mb-2"
            : "estado-pill badge-soft-green mb-2";
    }

    const input = document.getElementById("identificadorAnimalLoteEmbarque");

    if (input) {
        input.disabled = lote.estado === "cerrado";

        setTimeout(function () {
            if (lote.estado !== "cerrado") {
                input.focus();
                input.select();
            }
        }, 100);
    }

    actualizarBotonCerrarLoteEmbarque(lote);
    mostrarAnimalesLoteEmbarque();
}

// Agrega animal al lote activo.
function agregarAnimalAlLoteEmbarque() {
    const lote = obtenerLoteEmbarquePorId(loteEmbarqueActivoId);
    const input = document.getElementById("identificadorAnimalLoteEmbarque");

    if (!lote || !input) return;

    if (lote.estado === "cerrado") {
        mostrarResultadoLecturaLoteEmbarque(
            "Este lote está cerrado.",
            "Abrilo nuevamente si necesitás agregar animales.",
            "warning"
        );
        return;
    }

    const identificador = input.value.trim();

    if (identificador === "") {
        mostrarResultadoLecturaLoteEmbarque(
            "Ingresá una caravana o RFID.",
            "También podés usar un lector RFID que escriba como teclado.",
            "warning"
        );
        return;
    }

    const animalesLote = obtenerAnimalesLotesEmbarque();

    const coincidencias = buscarCoincidenciasLoteEmbarque(identificador);
    const animal = coincidencias.length === 1 ? coincidencias[0] : null;
    const nuevoRegistro = crearRegistroAnimalLoteEmbarque(lote, animal, coincidencias.length > 1);

    if (nuevoRegistro.estado !== "apto") {
        mostrarResultadoLecturaLoteEmbarque("Animal no apto. No se agregó al lote.", nuevoRegistro.motivoBloqueo, "danger");
        return;
    }
    if (animalYaExisteEnLote(lote.id, animal, animalesLote)) {
        mostrarResultadoLecturaLoteEmbarque("Animal repetido en este lote.", "No se agregó para evitar duplicados.", "warning");
        limpiarInputLecturaLoteEmbarque();
        return;
    }
    animalesLote.push(nuevoRegistro);
    guardarAnimalesLotesEmbarque(animalesLote);

    mostrarResultadoLecturaLoteEmbarque(
        "Animal apto agregado.",
        nuevoRegistro.caravanaVisual || nuevoRegistro.codigoRFID || identificador,
        "success"
    );

    limpiarInputLecturaLoteEmbarque();
    mostrarLotesEmbarque();
    mostrarPanelLoteEmbarqueActivo();
}

// Crea registro de animal dentro del lote.
function crearRegistroAnimalLoteEmbarque(lote, animal, ambiguo, bloqueos) {
    if (!animal) {
        return {estado: "no_apto", motivoBloqueo: ambiguo ? MOTIVO_IDENTIDAD_SANITARIA : "Animal no registrado en RuralData."};
    }

    const carencia = obtenerCarenciaActivaLoteEmbarque(animal, bloqueos);
    if (carencia) {
        return {estado: "no_apto", motivoBloqueo: describirBloqueoLoteEmbarque(carencia)};
    }

    return {
        id: crearIdLoteEmbarque(),
        loteId: lote.id,
        animalId: animal.id,
        caravanaVisual: animal.caravanaVisual || obtenerUltimosOchoDigitosLoteEmbarque(animal.codigoRFID),
        codigoRFID: animal.codigoRFID || "",
        estado: "apto",
        motivoBloqueo: "",
        camion: "",
        ordenCarga: obtenerSiguienteOrdenCargaLote(lote.id),
        fechaLectura: new Date().toISOString()
    };
}

// Muestra animales del lote activo.
function mostrarAnimalesLoteEmbarque() {
    const listaAptos = document.getElementById("listaAnimalesAptosLoteEmbarque");
    const listaNoAptos = document.getElementById("listaAnimalesNoAptosLoteEmbarque");

    if (!listaAptos || !listaNoAptos) return;

    const animalesLote = obtenerAnimalesDelLoteActivo();

    let aptos = [];
    let noAptos = [];

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].estado === "apto") {
            aptos.push(animalesLote[i]);
        } else {
            noAptos.push(animalesLote[i]);
        }
    }

    actualizarTextoLoteEmbarque("totalAnimalesLoteEmbarque", animalesLote.length);
    actualizarTextoLoteEmbarque("totalAptosLoteEmbarque", aptos.length);
    actualizarTextoLoteEmbarque("totalNoAptosLoteEmbarque", noAptos.length);

    listaAptos.innerHTML = crearHtmlAnimalesLoteEmbarque(aptos, true);
    listaNoAptos.innerHTML = crearHtmlAnimalesLoteEmbarque(noAptos, false);
}

// Crea HTML de animales del lote.
function crearHtmlAnimalesLoteEmbarque(animalesLote, esApto) {
    if (animalesLote.length === 0) {
        return `
      <div class="alert alert-light border mb-0">
        Sin animales ${esApto ? "aptos" : "no aptos"}.
      </div>
    `;
    }

    let html = "";

    for (let i = 0; i < animalesLote.length; i++) {
        const registro = animalesLote[i];
        const clase = esApto ? "apto" : "no-apto";
        const textoEstado = esApto ? "APTO" : "NO APTO";
        const claseBadge = esApto ? "badge-soft-green" : "badge-soft-red";

        html += `
      <article class="embarque-animal-linea ${clase}">
        <div class="embarque-animal-principal">
          <div class="embarque-animal-identidad">
            <strong>
              ${escaparHTMLLoteEmbarque(registro.caravanaVisual || "Sin caravana")}
            </strong>

            <span>
              RFID: ${escaparHTMLLoteEmbarque(registro.codigoRFID || "Sin dato")}
            </span>
          </div>

          <span class="estado-pill ${claseBadge}">
            ${textoEstado}
          </span>
        </div>

        <div class="embarque-animal-detalle">
          <span>
            Orden: ${registro.ordenCarga || "-"}
          </span>

          <span>
            Lectura: ${formatearFechaHoraLoteEmbarque(registro.fechaLectura)}
          </span>
        </div>

        ${registro.motivoBloqueo
                ? `<p class="mb-0 mt-2 text-danger fw-bold">${escaparHTMLLoteEmbarque(registro.motivoBloqueo)}</p>`
                : ""
            }

        <div class="mt-2">
        <button
  type="button"
  class="btn btn-outline-danger btn-sm"
  onclick="quitarAnimalDelLoteEmbarque('${registro.id}')"
>
  <i class="bi bi-x-circle"></i>
  Quitar
</button>
        </div>
      </article>
    `;
    }

    return html;
}

// Quita animal del lote.
function quitarAnimalDelLoteEmbarque(idRegistro) {
    const confirmar = confirm("¿Quitar este animal del lote?");

    if (!confirmar) return;

    const animalesLote = obtenerAnimalesLotesEmbarque();
    const nuevos = [];

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].id !== idRegistro) {
            nuevos.push(animalesLote[i]);
        }
    }

    guardarAnimalesLotesEmbarque(nuevos);

    mostrarLotesEmbarque();
    mostrarPanelLoteEmbarqueActivo();
}

// Exporta TXT solo con animales aptos.
function exportarTxtLoteEmbarque() {
    const lote = obtenerLoteEmbarquePorId(loteEmbarqueActivoId);

    if (!lote) return;

    const animalesLote = obtenerAnimalesDelLoteActivo();
    const aptos = animalesLote.filter(registro => registro.estado === "apto");
    const cantidadesPorCaravana = new Map();
    for (const animal of obtenerAnimales()) {
        const caravana = obtenerCaravanaParaTxtLote(animal);
        cantidadesPorCaravana.set(caravana, (cantidadesPorCaravana.get(caravana) || 0) + 1);
    }
    const exportables = aptos.filter(registro => {
        const caravana = obtenerCaravanaParaTxtLote(registro);
        return caravana && cantidadesPorCaravana.get(caravana) === 1;
    });
    const omitidos = aptos.length - exportables.length;
    const motivoOmitidos = "Hay caravanas TXT de ocho dígitos ambiguas o inválidas.";

    if (exportables.length === 0) {
        mostrarResultadoLecturaLoteEmbarque(
            "No hay animales aptos para exportar.",
            omitidos ? motivoOmitidos : "El TXT preventivo se genera solo con animales aptos.",
            "warning"
        );
        return;
    }

    const numeroGuia = lote.numeroGuia && lote.numeroGuia.trim() !== ""
        ? lote.numeroGuia.trim()
        : "SIN_GUIA";

    let contenido = "";

    for (const registro of exportables) {
        contenido += crearLineaTxtLoteEmbarque(registro, numeroGuia) + "\n";
    }

    const nombreArchivo = crearNombreArchivoTxtLoteEmbarque(lote);
    descargarArchivoTextoLoteEmbarque(nombreArchivo, contenido);

    mostrarResultadoLecturaLoteEmbarque(
        "TXT generado correctamente.",
        "Se exportaron " + exportables.length + " animales aptos." + (omitidos ? " " + motivoOmitidos : ""),
        omitidos ? "warning" : "success"
    );
}

function obtenerCaravanaParaTxtLote(registro) {
    return obtenerUltimosOchoDigitosLoteEmbarque(registro.codigoRFID || registro.caravanaVisual);
}

// Crea línea TXT preventiva.
function crearLineaTxtLoteEmbarque(registro, numeroGuia) {
    const caravana = obtenerCaravanaParaTxtLote(registro);

    const codigoCompleto = "A00000008580000" + caravana;
    const ahora = new Date();

    return "[|" +
        codigoCompleto + "|" +
        obtenerFechaTxtLoteEmbarque(ahora) + "|" +
        obtenerHoraTxtLoteEmbarque(ahora) + "|" +
        numeroGuia + "|" +
        ".|.|.|.|.|.|.|.|.|.|" +
        "]";
}

// Cierra o reabre lote.
function cerrarLoteEmbarqueActivo() {
    const lotes = obtenerLotesEmbarque();

    for (let i = 0; i < lotes.length; i++) {
        if (lotes[i].id === loteEmbarqueActivoId) {
            lotes[i].estado = lotes[i].estado === "cerrado" ? "abierto" : "cerrado";
            lotes[i].fechaActualizacion = new Date().toISOString();

            guardarLotesEmbarque(lotes);

            mostrarLotesEmbarque();
            mostrarPanelLoteEmbarqueActivo();

            return;
        }
    }
}

// Actualiza texto del botón cerrar/reabrir.
// Actualiza texto del botón cerrar/reabrir.
function actualizarBotonCerrarLoteEmbarque(lote) {
    const btn = document.getElementById("btnCerrarLoteEmbarque");

    if (!btn) return;

    if (lote.estado === "cerrado") {
        btn.innerHTML = `
      <i class="bi bi-unlock"></i>
      Reabrir
    `;
    } else {
        btn.innerHTML = `
      <i class="bi bi-lock"></i>
      Cerrar
    `;
    }
}



// Elimina lote activo y sus animales.
function eliminarLoteEmbarqueActivo() {
    const lote = obtenerLoteEmbarquePorId(loteEmbarqueActivoId);

    if (!lote) return;

    const confirmar = confirm("¿Eliminar este lote y sus animales cargados?");

    if (!confirmar) return;

    const lotes = obtenerLotesEmbarque();
    const nuevosLotes = [];

    for (let i = 0; i < lotes.length; i++) {
        if (lotes[i].id !== lote.id) {
            nuevosLotes.push(lotes[i]);
        }
    }

    const animalesLote = obtenerAnimalesLotesEmbarque();
    const nuevosAnimalesLote = [];

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].loteId !== lote.id) {
            nuevosAnimalesLote.push(animalesLote[i]);
        }
    }

    guardarLotesEmbarque(nuevosLotes);
    guardarAnimalesLotesEmbarque(nuevosAnimalesLote);

    loteEmbarqueActivoId = null;

    const panel = document.getElementById("panelTrabajoLoteEmbarque");

    if (panel) {
        panel.classList.add("d-none");
    }

    mostrarMensajeLotesEmbarque("Lote eliminado correctamente.", "success");
    mostrarLotesEmbarque();
}

// Busca animal por caravana, RFID o últimos 8 dígitos.
function buscarCoincidenciasLoteEmbarque(identificador, animales = obtenerAnimales()) {
    const sufijo = obtenerUltimosOchoDigitosLoteEmbarque(identificador);
    return buscarCoincidenciasIdentificacionSanitaria(identificador, animales, animal =>
        sufijo && (obtenerUltimosOchoDigitosLoteEmbarque(animal.codigoRFID) === sufijo ||
            normalizarIdentificadorSanitario(animal.caravanaVisual) === sufijo)
    );
}

// Detecta duplicado dentro del lote.
function animalYaExisteEnLote(idLote, animal, animalesLote, animales = obtenerAnimales()) {
    return animalesLote.some(registro => {
        if (registro.loteId !== idLote) return false;
        if (registro.animalId) return registro.animalId === animal.id;
        return resolverAsociacionSanitaria(registro, animales).animal?.id === animal.id;
    });
}

// Revisa carencia sanitaria vigente.
function obtenerCarenciaActivaLoteEmbarque(animal, bloqueos = obtenerBloqueosSanitariosMvp()) {
    return bloqueos[animal.id] || null;
}

// Obtiene lote por id.
function obtenerLoteEmbarquePorId(idLote) {
    const lotes = obtenerLotesEmbarque();

    for (let i = 0; i < lotes.length; i++) {
        if (lotes[i].id === idLote) {
            return lotes[i];
        }
    }

    return null;
}

// Revalida sin reescribir la lectura histórica ni cambiar IDs, camión u orden.
function revalidarAnimalLoteEmbarque(registro, animales, bloqueos) {
    const referencia = registro.animalId ? { animalId: registro.animalId } : registro;
    const { animal, candidatos } = resolverAsociacionSanitaria(referencia, animales);
    if (!animal) {
        return {...registro, estado: "no_apto",
            motivoBloqueo: candidatos.length ? MOTIVO_IDENTIDAD_SANITARIA : "Animal no registrado en RuralData."};
    }
    const carencia = bloqueos[animal.id];
    return {...registro, caravanaVisual: animal.caravanaVisual || "", codigoRFID: animal.codigoRFID || "",
        estado: carencia ? "no_apto" : "apto",
        motivoBloqueo: carencia ? describirBloqueoLoteEmbarque(carencia) : ""};
}

function describirBloqueoLoteEmbarque(carencia) {
    return carencia.motivoPreventivo ||
        "Carencia sanitaria vigente hasta " + formatearFechaLoteEmbarque(carencia.fechaLiberacion);
}

// Obtiene animales del lote activo con aptitud vigente, también al exportar.
function obtenerAnimalesDelLoteActivo() {
    const animalesLote = obtenerAnimalesLotesEmbarque();
    const animales = obtenerAnimales();
    const bloqueos = obtenerBloqueosSanitariosMvp(animales);
    const resultado = [];

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].loteId === loteEmbarqueActivoId) {
            resultado.push(revalidarAnimalLoteEmbarque(animalesLote[i], animales, bloqueos));
        }
    }

    resultado.sort(function (a, b) {
        return Number(a.ordenCarga || 0) - Number(b.ordenCarga || 0);
    });

    return resultado;
}

// Resumen por lote.
function obtenerResumenLoteEmbarque(idLote) {
    const animalesLote = obtenerAnimalesLotesEmbarque();
    const animales = obtenerAnimales();
    const bloqueos = obtenerBloqueosSanitariosMvp(animales);

    let total = 0;
    let aptos = 0;
    let noAptos = 0;

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].loteId !== idLote) continue;

        total++;

        if (revalidarAnimalLoteEmbarque(animalesLote[i], animales, bloqueos).estado === "apto") {
            aptos++;
        } else {
            noAptos++;
        }
    }

    return {
        total: total,
        aptos: aptos,
        noAptos: noAptos
    };
}

// Siguiente orden de carga.
function obtenerSiguienteOrdenCargaLote(idLote) {
    const animalesLote = obtenerAnimalesLotesEmbarque();

    let mayor = 0;

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].loteId === idLote) {
            const orden = Number(animalesLote[i].ordenCarga || 0);

            if (orden > mayor) {
                mayor = orden;
            }
        }
    }

    return mayor + 1;
}

// Estado de carencia.
function obtenerEstadoCarenciaLoteEmbarque(fechaLiberacion) {
    const hoy = obtenerFechaSinHoraLoteEmbarque(new Date());
    const fecha = obtenerFechaDesdeISOLoteEmbarque(fechaLiberacion);

    if (fecha > hoy) {
        return "En carencia";
    }

    return "Liberado";
}

// Fecha local desde ISO.
function obtenerFechaDesdeISOLoteEmbarque(fechaISO) {
    const partes = fechaISO.split("-");

    const anio = Number(partes[0]);
    const mes = Number(partes[1]) - 1;
    const dia = Number(partes[2]);

    return new Date(anio, mes, dia);
}

// Quita hora.
function obtenerFechaSinHoraLoteEmbarque(fecha) {
    return new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        fecha.getDate()
    );
}

// Limpia input.
function limpiarInputLecturaLoteEmbarque() {
    const input = document.getElementById("identificadorAnimalLoteEmbarque");

    if (!input) return;

    input.value = "";

    setTimeout(function () {
        input.focus();
    }, 100);
}

// Mensaje superior.
function mostrarMensajeLotesEmbarque(texto, tipo) {
    const contenedor = document.getElementById("mensajeLotesEmbarque");

    if (!contenedor) return;

    contenedor.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${escaparHTMLLoteEmbarque(texto)}
    </div>
  `;
}

// Resultado de lectura.
function mostrarResultadoLecturaLoteEmbarque(titulo, detalle, tipo) {
    const contenedor = document.getElementById("resultadoLecturaLoteEmbarque");

    if (!contenedor) return;

    contenedor.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      <strong>${escaparHTMLLoteEmbarque(titulo)}</strong>
      <div>${escaparHTMLLoteEmbarque(detalle)}</div>
    </div>
  `;
}

// Descargar archivo TXT.
function descargarArchivoTextoLoteEmbarque(nombreArchivo, contenido) {
    const blob = new Blob([contenido], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();

    URL.revokeObjectURL(url);
}

// Nombre TXT.
function crearNombreArchivoTxtLoteEmbarque(lote) {
    const nombreSeguro = normalizarNombreArchivoLoteEmbarque(lote.nombre || "lote");
    const fecha = lote.fecha || obtenerFechaHoyLoteEmbarque();

    return "ruraldata_" + nombreSeguro + "_" + fecha + ".txt";
}

// Normaliza nombre archivo.
function normalizarNombreArchivoLoteEmbarque(texto) {
    return String(texto || "")
        .trim()
        .toLowerCase()
        .replaceAll(" ", "_")
        .replace(/[^a-z0-9_\-]/g, "");
}

// Fecha hoy.
function obtenerFechaHoyLoteEmbarque() {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
}

// Fecha DD/MM/AAAA.
function formatearFechaLoteEmbarque(fechaISO) {
    if (!fechaISO) return "Sin fecha";

    const partes = fechaISO.split("-");

    if (partes.length !== 3) return fechaISO;

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}

// Fecha y hora de lectura.
function formatearFechaHoraLoteEmbarque(fechaISO) {
    if (!fechaISO) return "Sin dato";

    const fecha = new Date(fechaISO);

    if (isNaN(fecha.getTime())) {
        return "Sin dato";
    }

    return fecha.toLocaleDateString("es-UY") + " " + fecha.toLocaleTimeString("es-UY", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// Fecha TXT DDMMYYYY.
function obtenerFechaTxtLoteEmbarque(fecha) {
    const dia = String(fecha.getDate()).padStart(2, "0");
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const anio = fecha.getFullYear();

    return dia + mes + anio;
}

// Hora TXT HHMMSS.
function obtenerHoraTxtLoteEmbarque(fecha) {
    const hora = String(fecha.getHours()).padStart(2, "0");
    const minutos = String(fecha.getMinutes()).padStart(2, "0");
    const segundos = String(fecha.getSeconds()).padStart(2, "0");

    return hora + minutos + segundos;
}

// Últimos 8 dígitos.
function obtenerUltimosOchoDigitosLoteEmbarque(valor) {
    if (!valor) return "";

    const soloNumeros = String(valor).replace(/\D/g, "");

    if (soloNumeros.length < 8) {
        return "";
    }

    return soloNumeros.slice(-8);
}

// Actualiza texto.
function actualizarTextoLoteEmbarque(idElemento, valor) {
    const elemento = document.getElementById(idElemento);

    if (!elemento) return;

    elemento.textContent = valor;
}

// Crea id.
function crearIdLoteEmbarque() {
    if (window.crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return "id_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}

// Escapa HTML.
function escaparHTMLLoteEmbarque(texto) {
    if (!texto) return "";

    return String(texto)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}



// Carga un TXT dentro del lote activo.
function cargarTxtEnLoteEmbarque() {
  const lote = obtenerLoteEmbarquePorId(loteEmbarqueActivoId);
  const inputArchivo = document.getElementById("archivoTxtLoteEmbarque");

  if (!lote || !inputArchivo) return;

  if (lote.estado === "cerrado") {
    mostrarResultadoLecturaLoteEmbarque(
      "Este lote está cerrado.",
      "Reabrilo para cargar animales desde TXT.",
      "warning"
    );
    return;
  }

  if (!inputArchivo.files || inputArchivo.files.length === 0) {
    mostrarResultadoLecturaLoteEmbarque(
      "Seleccioná un archivo TXT.",
      "El archivo debe venir del lector o del caravaneo.",
      "warning"
    );
    return;
  }

  const archivo = inputArchivo.files[0];
  const lector = new FileReader();

  lector.onload = function (event) {
    const contenido = event.target.result || "";

    procesarContenidoTxtLoteEmbarque(contenido);

    inputArchivo.value = "";
  };

  lector.onerror = function () {
    mostrarResultadoLecturaLoteEmbarque(
      "No se pudo leer el archivo.",
      "Probá nuevamente con otro TXT.",
      "danger"
    );
  };

  lector.readAsText(archivo);
}

// Procesa el contenido del TXT y agrega animales al lote activo.
function procesarContenidoTxtLoteEmbarque(contenido) {
  const lote = obtenerLoteEmbarquePorId(loteEmbarqueActivoId);

  if (!lote) return;

  const lineas = contenido.split(/\r?\n/);
  const animalesLote = obtenerAnimalesLotesEmbarque();
  const animales = obtenerAnimales();
  const bloqueos = obtenerBloqueosSanitariosMvp(animales);

  let agregados = 0;
  const motivosRechazo = new Set();
  let noAptos = 0;
  let duplicados = 0;
  let invalidos = 0;

  for (let i = 0; i < lineas.length; i++) {
    const identificador = extraerIdentificadorDesdeLineaTxtLoteEmbarque(lineas[i]);

    if (identificador === "") {
      invalidos++;
      continue;
    }

    const coincidencias = buscarCoincidenciasLoteEmbarque(identificador, animales);
    const animal = coincidencias.length === 1 ? coincidencias[0] : null;
    const nuevoRegistro = crearRegistroAnimalLoteEmbarque(lote, animal, coincidencias.length > 1, bloqueos);

    if (nuevoRegistro.estado !== "apto") {
      noAptos++;
      motivosRechazo.add(nuevoRegistro.motivoBloqueo);
      continue;
    }
    if (animalYaExisteEnLote(lote.id, animal, animalesLote, animales)) {
      duplicados++;
      continue;
    }
    animalesLote.push(nuevoRegistro);

    agregados++;
  }

  if (agregados) guardarAnimalesLotesEmbarque(animalesLote);

  mostrarLotesEmbarque();
  mostrarPanelLoteEmbarqueActivo();

  mostrarResultadoLecturaLoteEmbarque(
    "TXT cargado.",
    "Agregados: " + agregados +
      " · No aptos rechazados: " + noAptos +
      " · Duplicados: " + duplicados +
      " · Inválidos: " + invalidos +
      (motivosRechazo.size ? " · " + [...motivosRechazo].join(" · ") : ""),
    noAptos ? "warning" : "success"
  );
}

// Extrae RFID o caravana desde una línea TXT.
function extraerIdentificadorDesdeLineaTxtLoteEmbarque(linea) {
  if (!linea) return "";

  const texto = String(linea).trim();

  if (texto === "") return "";

  if (texto.includes("|")) {
    const partes = texto.split("|");

    for (let i = 0; i < partes.length; i++) {
      const limpio = partes[i].replace("[", "").replace("]", "").trim();

      if (limpio === "") continue;
      if (limpio === ".") continue;

      const numeros = limpio.replace(/\D/g, "");

      if (numeros.length >= 8) {
        return limpio;
      }
    }

    return "";
  }

  const numerosLinea = texto.replace(/\D/g, "");

  if (numerosLinea.length >= 8) {
    return texto;
  }

  return "";
}
