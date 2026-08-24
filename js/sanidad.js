// Manejo del módulo sanitario de RuralData.
// Permite controles comunes y tratamientos con carencia sanitaria.

document.addEventListener("DOMContentLoaded", function () {
  inicializarSanidad();
});

function inicializarSanidad() {
  const formSanidad = document.getElementById("formSanidad");
  const identificacionAnimal = document.getElementById("identificacionAnimal");
  const fechaAplicacion = document.getElementById("fechaAplicacion");
  const diasCarencia = document.getElementById("diasCarencia");
  const tieneCarencia = document.getElementById("tieneCarencia");

  const btnTabRegistrar = document.getElementById("btnTabRegistrarSanidad");
  const btnTabCarencias = document.getElementById("btnTabCarenciasSanidad");

  if (fechaAplicacion) {
    fechaAplicacion.value = obtenerFechaActualISO();
  }

  mostrarOcultarBloqueCarencia();
  actualizarFechaLiberacionTexto();
  mostrarSanidadReciente();
  mostrarAnimalesEnCarencia();

  if (formSanidad) {
    formSanidad.addEventListener("submit", registrarControlSanitario);
  }

  if (identificacionAnimal) {
    identificacionAnimal.addEventListener("input", mostrarAnimalSeleccionadoSanidad);
  }

  if (fechaAplicacion) {
    fechaAplicacion.addEventListener("change", actualizarFechaLiberacionTexto);
  }

  if (diasCarencia) {
    diasCarencia.addEventListener("input", actualizarFechaLiberacionTexto);
  }

  if (tieneCarencia) {
    tieneCarencia.addEventListener("change", function () {
      mostrarOcultarBloqueCarencia();
      actualizarFechaLiberacionTexto();
    });
  }

  if (btnTabRegistrar) {
    btnTabRegistrar.addEventListener("click", function () {
      cambiarTabSanidad("registrar");
    });
  }

  if (btnTabCarencias) {
    btnTabCarencias.addEventListener("click", function () {
      cambiarTabSanidad("carencias");
    });
  }
}

// Cambia entre pestañas de sanidad.
function cambiarTabSanidad(tab) {
  const btnTabRegistrar = document.getElementById("btnTabRegistrarSanidad");
  const btnTabCarencias = document.getElementById("btnTabCarenciasSanidad");

  const tabRegistrar = document.getElementById("tabRegistrarSanidad");
  const tabCarencias = document.getElementById("tabCarenciasSanidad");

  if (!btnTabRegistrar || !btnTabCarencias || !tabRegistrar || !tabCarencias) {
    return;
  }

  if (tab === "registrar") {
    btnTabRegistrar.classList.add("activo");
    btnTabCarencias.classList.remove("activo");

    tabRegistrar.classList.remove("d-none");
    tabCarencias.classList.add("d-none");
  }

  if (tab === "carencias") {
    btnTabRegistrar.classList.remove("activo");
    btnTabCarencias.classList.add("activo");

    tabRegistrar.classList.add("d-none");
    tabCarencias.classList.remove("d-none");

    mostrarAnimalesEnCarencia();
  }
}

// Muestra u oculta el bloque de carencia.
function mostrarOcultarBloqueCarencia() {
  const tieneCarencia = document.getElementById("tieneCarencia");
  const bloqueCarencia = document.getElementById("bloqueCarencia");

  if (!tieneCarencia || !bloqueCarencia) return;

  if (tieneCarencia.value === "si") {
    bloqueCarencia.classList.remove("d-none");
  } else {
    bloqueCarencia.classList.add("d-none");
  }
}

// Registra un nuevo control sanitario.
function registrarControlSanitario(event) {
  event.preventDefault();

  const identificacion = document.getElementById("identificacionAnimal").value.trim();
  const tipoControl = document.getElementById("tipoControl").value;
  const producto = document.getElementById("producto").value.trim();
  const numeroHabilitacion = document.getElementById("numeroHabilitacion").value.trim();
  const fechaAplicacion = document.getElementById("fechaAplicacion").value;
  const fechaProxima = document.getElementById("fechaProxima").value;
  const tieneCarencia = document.getElementById("tieneCarencia").value;
  const diasCarenciaInput = document.getElementById("diasCarencia").value;
  const dosis = document.getElementById("dosis").value.trim();
  const viaAdministracion = document.getElementById("viaAdministracion").value;
  const veterinarioFirmante = document.getElementById("veterinarioFirmante").value.trim();
  const observaciones = document.getElementById("observaciones").value.trim();

  const animal = buscarAnimalPorIdentificacion(identificacion);

  if (!animal) {
    mostrarMensajeSanidad(
      "No se encontró un animal registrado con esa caravana o RFID.",
      true
    );
    return;
  }

  if (!fechaAplicacion) {
    mostrarMensajeSanidad("Debe indicar la fecha de aplicación.", true);
    return;
  }

  let diasCarencia = 0;
  let fechaLiberacion = "";
  let estadoCarencia = "Sin carencia";

  if (tieneCarencia === "si") {
    diasCarencia = Number(diasCarenciaInput);

    if (diasCarencia < 1 || isNaN(diasCarencia)) {
      mostrarMensajeSanidad(
        "Si el tratamiento tiene carencia, debe indicar al menos 1 día.",
        true
      );
      return;
    }

    fechaLiberacion = calcularFechaLiberacion(fechaAplicacion, diasCarencia);
    estadoCarencia = obtenerEstadoCarencia(fechaLiberacion);
  }

  const registros = obtenerSanidad();

  const nuevoRegistro = {
    id: crypto.randomUUID(),

    animalId: animal.id || "",
    identificacion: identificacion,
    caravanaVisual: animal.caravanaVisual || "",
    codigoRFID: animal.codigoRFID || "",
    categoriaAnimal: animal.categoria || "",
    propietarioAnimal: animal.propietario || "",
    campoAnimal: animal.campo || "",

    tipoControl: tipoControl,
    producto: producto,
    numeroHabilitacion: numeroHabilitacion,

    fechaAplicacion: fechaAplicacion,
    fechaProxima: fechaProxima,

    tieneCarencia: tieneCarencia === "si",
    diasCarencia: diasCarencia,
    fechaLiberacion: fechaLiberacion,
    estadoCarencia: estadoCarencia,

    dosis: dosis,
    viaAdministracion: viaAdministracion,
    veterinarioFirmante: veterinarioFirmante,
    observaciones: observaciones,

    fechaRegistro: new Date().toISOString()
  };

  registros.push(nuevoRegistro);
  guardarSanidad(registros);

  event.target.reset();

  document.getElementById("fechaAplicacion").value = obtenerFechaActualISO();
  document.getElementById("tieneCarencia").value = "no";
  document.getElementById("diasCarencia").value = 1;

  mostrarOcultarBloqueCarencia();
  actualizarFechaLiberacionTexto();
  limpiarResultadoAnimalSanidad();
  mostrarSanidadReciente();
  mostrarAnimalesEnCarencia();

  mostrarMensajeSanidad(
    tieneCarencia === "si"
      ? "Control guardado correctamente. Estado: " + estadoCarencia + "."
      : "Control sanitario sin carencia guardado correctamente.",
    false
  );
}

// Busca un animal por caravana visual o RFID.
function buscarAnimalPorIdentificacion(identificacion) {
  const animales = obtenerAnimales();

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = animal.caravanaVisual ? animal.caravanaVisual.trim() : "";
    const codigoRFID = animal.codigoRFID ? animal.codigoRFID.trim() : "";

    if (
      caravanaVisual === identificacion ||
      codigoRFID === identificacion
    ) {
      return animal;
    }
  }

  return null;
}

// Muestra el animal encontrado mientras se escribe.
function mostrarAnimalSeleccionadoSanidad() {
  const identificacion = document.getElementById("identificacionAnimal").value.trim();
  const resultado = document.getElementById("resultadoAnimalSanidad");

  if (!resultado) return;

  if (identificacion.length === 0) {
    resultado.innerHTML = "";
    return;
  }

  const animal = buscarAnimalPorIdentificacion(identificacion);

  if (!animal) {
    resultado.innerHTML = `
      <div class="alert alert-warning mb-0">
        No se encontró un animal con esa identificación.
      </div>
    `;
    return;
  }

  resultado.innerHTML = `
    <div class="alert alert-success mb-0">
      <strong>Animal encontrado</strong><br>
      Caravana: ${animal.caravanaVisual || "Sin dato"}<br>
      RFID: ${animal.codigoRFID || "Sin dato"}<br>
      Categoría: ${animal.categoria || "Sin dato"}
    </div>
  `;
}

// Limpia el resultado del animal.
function limpiarResultadoAnimalSanidad() {
  const resultado = document.getElementById("resultadoAnimalSanidad");

  if (!resultado) return;

  resultado.innerHTML = "";
}

// Actualiza el texto de fecha de liberación.
function actualizarFechaLiberacionTexto() {
  const fechaAplicacionInput = document.getElementById("fechaAplicacion");
  const diasCarenciaInput = document.getElementById("diasCarencia");
  const fechaLiberacionTexto = document.getElementById("fechaLiberacionTexto");
  const tieneCarencia = document.getElementById("tieneCarencia");

  if (!fechaAplicacionInput || !diasCarenciaInput || !fechaLiberacionTexto) {
    return;
  }

  if (tieneCarencia && tieneCarencia.value !== "si") {
    fechaLiberacionTexto.textContent = "-";
    return;
  }

  const fechaAplicacion = fechaAplicacionInput.value;
  const diasCarencia = Number(diasCarenciaInput.value);

  if (!fechaAplicacion || isNaN(diasCarencia) || diasCarencia < 1) {
    fechaLiberacionTexto.textContent = "-";
    return;
  }

  const fechaLiberacion = calcularFechaLiberacion(fechaAplicacion, diasCarencia);
  const estado = obtenerEstadoCarencia(fechaLiberacion);

  fechaLiberacionTexto.textContent =
    formatearFecha(fechaLiberacion) + " · " + estado;
}

// Calcula fecha de liberación sumando días de carencia.
function calcularFechaLiberacion(fechaAplicacion, diasCarencia) {
  const fecha = obtenerFechaDesdeISO(fechaAplicacion);
  fecha.setDate(fecha.getDate() + diasCarencia);

  return convertirFechaAISO(fecha);
}

// Devuelve En carencia o Liberado.
function obtenerEstadoCarencia(fechaLiberacion) {
  const hoy = obtenerFechaSinHora(new Date());
  const fecha = obtenerFechaDesdeISO(fechaLiberacion);

  if (fecha > hoy) {
    return "En carencia";
  }

  return "Liberado";
}

// Muestra los últimos controles registrados.
function mostrarSanidadReciente() {
  const contenedor = document.getElementById("listaSanidadReciente");

  if (!contenedor) return;

  const registros = obtenerSanidad();

  contenedor.innerHTML = "";

  if (registros.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-info mb-0">
        Todavía no hay controles sanitarios registrados.
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

  const limite = registrosOrdenados.length > 5 ? 5 : registrosOrdenados.length;

  for (let i = 0; i < limite; i++) {
    const registro = registrosOrdenados[i];

    const tieneCarencia = registro.tieneCarencia === true || registro.fechaLiberacion;
    const estado = tieneCarencia && registro.fechaLiberacion
      ? obtenerEstadoCarencia(registro.fechaLiberacion)
      : "Sin carencia";

    const claseEstado = estado === "En carencia"
      ? "badge-soft-red"
      : estado === "Liberado"
        ? "badge-soft-green"
        : "badge-soft-yellow";

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-3 mb-2">
          <div>
            <p class="list-card-title mb-1">
              ${registro.tipoControl || "Control sanitario"}
            </p>

            <h3 class="h5 mb-1">
              ${registro.producto || "Producto sin nombre"}
            </h3>

            <p class="mb-0">
              Caravana: ${registro.caravanaVisual || registro.identificacion || "Sin dato"}
            </p>
          </div>

          <span class="estado-pill ${claseEstado}">
            ${estado}
          </span>
        </div>

        <p class="mb-1">
          Aplicación: ${formatearFecha(registro.fechaAplicacion)}
        </p>

        <p class="mb-1">
          Próxima aplicación: ${registro.fechaProxima ? formatearFecha(registro.fechaProxima) : "No indicada"}
        </p>

        <p class="mb-1">
          Liberación sanitaria: ${registro.fechaLiberacion ? formatearFecha(registro.fechaLiberacion) : "No aplica"}
        </p>

        <p class="mb-0">
          Carencia: ${registro.diasCarencia || 0} días
        </p>
      </div>
    `;

    contenedor.appendChild(item);
  }
}

// Muestra solo animales actualmente en carencia.
function mostrarAnimalesEnCarencia() {
  const contenedor = document.getElementById("listaAnimalesEnCarencia");

  if (!contenedor) return;

  const animalesEnCarencia = obtenerAnimalesEnCarenciaActual();

  contenedor.innerHTML = "";

  if (animalesEnCarencia.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-success mb-0">
        No hay animales actualmente en carencia sanitaria.
      </div>
    `;
    return;
  }

  for (let i = 0; i < animalesEnCarencia.length; i++) {
    const registro = animalesEnCarencia[i];
    const diasRestantes = calcularDiasRestantes(registro.fechaLiberacion);

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <span class="estado-pill badge-soft-red mb-3">
          En carencia
        </span>

        <h3 class="h5 mb-2">
          ${registro.caravanaVisual || registro.identificacion || "Animal sin caravana"}
        </h3>

        <p class="mb-1">
          Producto: ${registro.producto || "Sin dato"}
        </p>

        <p class="mb-1">
          Tipo: ${registro.tipoControl || "Sin dato"}
        </p>

        <p class="mb-1">
          Aplicación: ${formatearFecha(registro.fechaAplicacion)}
        </p>

        <p class="mb-1">
          Liberación: ${formatearFecha(registro.fechaLiberacion)}
        </p>

        <p class="mb-0">
          Restan: <strong>${diasRestantes}</strong> día(s)
        </p>
      </div>
    `;

    contenedor.appendChild(item);
  }
}

// Obtiene animales únicos que están actualmente en carencia.
function obtenerAnimalesEnCarenciaActual() {
  const registros = obtenerSanidad();
  const animalesPorClave = {};

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    if (!registro.fechaLiberacion) continue;

    const estado = obtenerEstadoCarencia(registro.fechaLiberacion);

    if (estado !== "En carencia") continue;

    const claveAnimal = obtenerClaveAnimalSanidad(registro);

    if (!animalesPorClave[claveAnimal]) {
      animalesPorClave[claveAnimal] = registro;
      continue;
    }

    const fechaActualGuardada = obtenerFechaDesdeISO(
      animalesPorClave[claveAnimal].fechaLiberacion
    );

    const fechaNueva = obtenerFechaDesdeISO(registro.fechaLiberacion);

    if (fechaNueva > fechaActualGuardada) {
      animalesPorClave[claveAnimal] = registro;
    }
  }

  return Object.values(animalesPorClave);
}

// Devuelve una clave única para el animal en sanidad.
function obtenerClaveAnimalSanidad(registro) {
  if (registro.animalId) return registro.animalId;
  if (registro.caravanaVisual) return registro.caravanaVisual;
  if (registro.codigoRFID) return registro.codigoRFID;
  if (registro.identificacion) return registro.identificacion;

  return registro.id;
}

// Calcula días restantes hasta liberación.
function calcularDiasRestantes(fechaLiberacion) {
  const hoy = obtenerFechaSinHora(new Date());
  const fecha = obtenerFechaDesdeISO(fechaLiberacion);

  const diferencia = fecha.getTime() - hoy.getTime();
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

  if (dias < 0) return 0;

  return dias;
}

// Muestra mensajes en el formulario.
function mostrarMensajeSanidad(texto, esError) {
  const mensaje = document.getElementById("mensajeSanidad");

  if (!mensaje) return;

  const clase = esError ? "alert-danger" : "alert-success";

  mensaje.innerHTML = `
    <div class="alert ${clase}">
      ${texto}
    </div>
  `;
}

// Devuelve la fecha actual en formato yyyy-mm-dd.
function obtenerFechaActualISO() {
  return convertirFechaAISO(new Date());
}

// Convierte Date a yyyy-mm-dd.
function convertirFechaAISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return anio + "-" + mes + "-" + dia;
}

// Convierte yyyy-mm-dd a Date local sin hora.
function obtenerFechaDesdeISO(fechaISO) {
  const partes = fechaISO.split("-");

  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  return new Date(anio, mes, dia);
}

// Devuelve una fecha sin hora.
function obtenerFechaSinHora(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );
}

// Formatea fecha yyyy-mm-dd a dd/mm/yyyy.
function formatearFecha(fechaISO) {
  if (!fechaISO) {
    return "Sin dato";
  }

  const partes = fechaISO.split("-");

  if (partes.length !== 3) {
    return fechaISO;
  }

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}