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

    mostrarLotesEmbarque();
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

    if (animalYaExisteEnLote(lote.id, identificador, animalesLote)) {
        mostrarResultadoLecturaLoteEmbarque(
            "Animal repetido en este lote.",
            "No se agregó para evitar duplicados.",
            "warning"
        );

        limpiarInputLecturaLoteEmbarque();
        return;
    }

    const animal = buscarAnimalParaLoteEmbarque(identificador);
    const nuevoRegistro = crearRegistroAnimalLoteEmbarque(lote, identificador, animal);

    animalesLote.push(nuevoRegistro);
    guardarAnimalesLotesEmbarque(animalesLote);

    if (nuevoRegistro.estado === "apto") {
        mostrarResultadoLecturaLoteEmbarque(
            "Animal apto agregado.",
            nuevoRegistro.caravanaVisual || nuevoRegistro.codigoRFID || identificador,
            "success"
        );
    } else {
        mostrarResultadoLecturaLoteEmbarque(
            "Animal no apto agregado.",
            nuevoRegistro.motivoBloqueo,
            "danger"
        );
    }

    limpiarInputLecturaLoteEmbarque();
    mostrarLotesEmbarque();
    mostrarPanelLoteEmbarqueActivo();
}

// Crea registro de animal dentro del lote.
function crearRegistroAnimalLoteEmbarque(lote, identificador, animal) {
    if (!animal) {
        return {
            id: crearIdLoteEmbarque(),
            loteId: lote.id,
            animalId: "",
            caravanaVisual: obtenerUltimosOchoDigitosLoteEmbarque(identificador) || identificador,
            codigoRFID: identificador,
            estado: "no_apto",
            motivoBloqueo: "Animal no registrado en RuralData.",
            camion: "",
            ordenCarga: obtenerSiguienteOrdenCargaLote(lote.id),
            fechaLectura: new Date().toISOString()
        };
    }

    const carencia = obtenerCarenciaActivaLoteEmbarque(animal);

    if (carencia) {
        return {
            id: crearIdLoteEmbarque(),
            loteId: lote.id,
            animalId: animal.id || "",
            caravanaVisual: animal.caravanaVisual || obtenerUltimosOchoDigitosLoteEmbarque(animal.codigoRFID),
            codigoRFID: animal.codigoRFID || "",
            estado: "no_apto",
            motivoBloqueo: "Carencia sanitaria vigente hasta " + formatearFechaLoteEmbarque(carencia.fechaLiberacion),
            camion: "",
            ordenCarga: obtenerSiguienteOrdenCargaLote(lote.id),
            fechaLectura: new Date().toISOString()
        };
    }

    return {
        id: crearIdLoteEmbarque(),
        loteId: lote.id,
        animalId: animal.id || "",
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
    const aptos = [];

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].estado === "apto") {
            aptos.push(animalesLote[i]);
        }
    }

    if (aptos.length === 0) {
        mostrarResultadoLecturaLoteEmbarque(
            "No hay animales aptos para exportar.",
            "El TXT preventivo se genera solo con animales aptos.",
            "warning"
        );
        return;
    }

    const numeroGuia = lote.numeroGuia && lote.numeroGuia.trim() !== ""
        ? lote.numeroGuia.trim()
        : "SIN_GUIA";

    let contenido = "";

    for (let i = 0; i < aptos.length; i++) {
        contenido += crearLineaTxtLoteEmbarque(aptos[i], numeroGuia) + "\n";
    }

    const nombreArchivo = crearNombreArchivoTxtLoteEmbarque(lote);
    descargarArchivoTextoLoteEmbarque(nombreArchivo, contenido);

    mostrarResultadoLecturaLoteEmbarque(
        "TXT generado correctamente.",
        "Se exportaron " + aptos.length + " animales aptos.",
        "success"
    );
}

// Crea línea TXT preventiva.
function crearLineaTxtLoteEmbarque(registro, numeroGuia) {
    const caravana = obtenerUltimosOchoDigitosLoteEmbarque(
        registro.codigoRFID || registro.caravanaVisual
    );

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
function buscarAnimalParaLoteEmbarque(identificador) {
    const animales = obtenerAnimales();
    const claveBusqueda = normalizarIdentificadorLoteEmbarque(identificador);
    const ultimosOchoBusqueda = obtenerUltimosOchoDigitosLoteEmbarque(identificador);

    for (let i = 0; i < animales.length; i++) {
        const animal = animales[i];

        const caravana = normalizarIdentificadorLoteEmbarque(animal.caravanaVisual || "");
        const rfid = normalizarIdentificadorLoteEmbarque(animal.codigoRFID || "");
        const rfidOcho = obtenerUltimosOchoDigitosLoteEmbarque(animal.codigoRFID || "");

        if (caravana !== "" && caravana === claveBusqueda) {
            return animal;
        }

        if (rfid !== "" && rfid === claveBusqueda) {
            return animal;
        }

        if (ultimosOchoBusqueda !== "" && rfidOcho !== "" && ultimosOchoBusqueda === rfidOcho) {
            return animal;
        }

        if (ultimosOchoBusqueda !== "" && caravana !== "" && ultimosOchoBusqueda === caravana) {
            return animal;
        }
    }

    return null;
}

// Detecta duplicado dentro del lote.
function animalYaExisteEnLote(idLote, identificador, animalesLote) {
    const claveBusqueda = normalizarIdentificadorLoteEmbarque(identificador);
    const ultimosOchoBusqueda = obtenerUltimosOchoDigitosLoteEmbarque(identificador);

    for (let i = 0; i < animalesLote.length; i++) {
        const registro = animalesLote[i];

        if (registro.loteId !== idLote) continue;

        const caravana = normalizarIdentificadorLoteEmbarque(registro.caravanaVisual || "");
        const rfid = normalizarIdentificadorLoteEmbarque(registro.codigoRFID || "");
        const rfidOcho = obtenerUltimosOchoDigitosLoteEmbarque(registro.codigoRFID || "");

        if (caravana !== "" && caravana === claveBusqueda) return true;
        if (rfid !== "" && rfid === claveBusqueda) return true;
        if (ultimosOchoBusqueda !== "" && rfidOcho !== "" && ultimosOchoBusqueda === rfidOcho) return true;
        if (ultimosOchoBusqueda !== "" && caravana !== "" && ultimosOchoBusqueda === caravana) return true;
    }

    return false;
}

// Revisa carencia sanitaria vigente.
function obtenerCarenciaActivaLoteEmbarque(animal) {
    const registros = obtenerSanidad();
    const claveAnimal = obtenerClaveAnimalLoteEmbarque(animal);

    let carenciaActiva = null;

    for (let i = 0; i < registros.length; i++) {
        const registro = registros[i];

        const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia) > 0;

        if (!tieneCarencia || !registro.fechaLiberacion) continue;

        const claveRegistro = obtenerClaveSanidadLoteEmbarque(registro);

        if (claveRegistro !== claveAnimal) continue;

        const estado = obtenerEstadoCarenciaLoteEmbarque(registro.fechaLiberacion);

        if (estado !== "En carencia") continue;

        if (!carenciaActiva) {
            carenciaActiva = registro;
            continue;
        }

        const fechaActual = obtenerFechaDesdeISOLoteEmbarque(carenciaActiva.fechaLiberacion);
        const fechaNueva = obtenerFechaDesdeISOLoteEmbarque(registro.fechaLiberacion);

        if (fechaNueva > fechaActual) {
            carenciaActiva = registro;
        }
    }

    return carenciaActiva;
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

// Obtiene animales del lote activo.
function obtenerAnimalesDelLoteActivo() {
    const animalesLote = obtenerAnimalesLotesEmbarque();
    const resultado = [];

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].loteId === loteEmbarqueActivoId) {
            resultado.push(animalesLote[i]);
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

    let total = 0;
    let aptos = 0;
    let noAptos = 0;

    for (let i = 0; i < animalesLote.length; i++) {
        if (animalesLote[i].loteId !== idLote) continue;

        total++;

        if (animalesLote[i].estado === "apto") {
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

// Clave animal.
function obtenerClaveAnimalLoteEmbarque(animal) {
    if (animal.id) return animal.id;
    if (animal.caravanaVisual) return animal.caravanaVisual;
    if (animal.codigoRFID) return animal.codigoRFID;

    return "animal_sin_id";
}

// Clave sanidad.
function obtenerClaveSanidadLoteEmbarque(registro) {
    if (registro.animalId) return registro.animalId;
    if (registro.caravanaVisual) return registro.caravanaVisual;
    if (registro.codigoRFID) return registro.codigoRFID;
    if (registro.identificacion) return registro.identificacion;

    return registro.id;
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

// Normaliza identificador.
function normalizarIdentificadorLoteEmbarque(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .replace(/\s/g, "");
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

  let agregados = 0;
  let aptos = 0;
  let noAptos = 0;
  let duplicados = 0;
  let invalidos = 0;

  for (let i = 0; i < lineas.length; i++) {
    const identificador = extraerIdentificadorDesdeLineaTxtLoteEmbarque(lineas[i]);

    if (identificador === "") {
      invalidos++;
      continue;
    }

    if (animalYaExisteEnLote(lote.id, identificador, animalesLote)) {
      duplicados++;
      continue;
    }

    const animal = buscarAnimalParaLoteEmbarque(identificador);
    const nuevoRegistro = crearRegistroAnimalLoteEmbarque(lote, identificador, animal);

    animalesLote.push(nuevoRegistro);

    agregados++;

    if (nuevoRegistro.estado === "apto") {
      aptos++;
    } else {
      noAptos++;
    }
  }

  guardarAnimalesLotesEmbarque(animalesLote);

  mostrarLotesEmbarque();
  mostrarPanelLoteEmbarqueActivo();

  mostrarResultadoLecturaLoteEmbarque(
    "TXT cargado.",
    "Agregados: " + agregados +
      " · Aptos: " + aptos +
      " · No aptos: " + noAptos +
      " · Duplicados: " + duplicados +
      " · Inválidos: " + invalidos,
    "success"
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