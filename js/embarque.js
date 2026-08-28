// Control preventivo de aptitud para embarque.
// Revisa animales registrados y bloquea los que tienen carencia sanitaria vigente.

let temporizadorBusquedaEmbarque = null;

document.addEventListener("DOMContentLoaded", function () {
  inicializarEmbarque();
  inicializarBusquedaRapidaEmbarque();
  inicializarDatosCabeceraEmbarque();
});

function inicializarEmbarque() {
  const btnTabNoAptos = document.getElementById("btnTabNoAptos");
  const btnTabAptos = document.getElementById("btnTabAptos");

  if (btnTabNoAptos) {
    btnTabNoAptos.addEventListener("click", function () {
      cambiarTabEmbarque("noAptos");
    });
  }

  if (btnTabAptos) {
    btnTabAptos.addEventListener("click", function () {
      cambiarTabEmbarque("aptos");
    });
  }

  cargarControlEmbarque();
}

// Inicializa el campo de búsqueda rápida por caravana o RFID.
function inicializarBusquedaRapidaEmbarque() {
  const formBuscar = document.getElementById("formBuscarEmbarque");
  const inputBusqueda = document.getElementById("identificacionEmbarque");

  if (formBuscar) {
    formBuscar.addEventListener("submit", function (event) {
      event.preventDefault();
      verificarAptitudPorBusqueda();
    });
  }

  if (inputBusqueda) {
    inputBusqueda.focus();

    inputBusqueda.addEventListener("input", function () {
      clearTimeout(temporizadorBusquedaEmbarque);

      temporizadorBusquedaEmbarque = setTimeout(function () {
        const valor = inputBusqueda.value.trim();

        if (valor.length >= 3) {
          verificarAptitudPorBusqueda();
        }

        if (valor.length === 0) {
          limpiarResultadoBusquedaEmbarque();
        }
      }, 350);
    });
  }
}

// Verifica si el animal leído está apto o no apto.
function verificarAptitudPorBusqueda() {
  const inputBusqueda = document.getElementById("identificacionEmbarque");
  const resultado = document.getElementById("resultadoBusquedaEmbarque");

  if (!inputBusqueda || !resultado) return;

  const identificacion = inputBusqueda.value.trim();

  if (identificacion.length === 0) {
    mostrarResultadoBusquedaEmbarque(
      "Debe ingresar una caravana o RFID.",
      "warning"
    );
    return;
  }

  const animal = buscarAnimalPorIdentificacionEmbarque(identificacion);

  if (!animal) {
    resultado.innerHTML = `
      <article class="embarque-resultado-compacto no-encontrado">
        <div class="embarque-resultado-icono">
          <i class="bi bi-question-circle"></i>
        </div>

        <div class="embarque-resultado-info">
          <strong>Animal no encontrado</strong>
          <span>No existe registro para: ${limpiarTextoEmbarque(identificacion)}</span>
        </div>
      </article>
    `;

    seleccionarInputBusquedaEmbarque();
    return;
  }

  const carenciasActivas = obtenerCarenciasActivasPorAnimal();
  const claveAnimal = obtenerClaveAnimal(animal);
  const carencia = carenciasActivas[claveAnimal];

  if (carencia) {
    resultado.innerHTML = crearHtmlAnimalEmbarqueCompacto(
      animal,
      "noApto",
      carencia,
      true
    );

    cambiarTabEmbarque("noAptos");
    seleccionarInputBusquedaEmbarque();
    return;
  }

  resultado.innerHTML = crearHtmlAnimalEmbarqueCompacto(
    animal,
    "apto",
    null,
    true
  );

  cambiarTabEmbarque("aptos");
  seleccionarInputBusquedaEmbarque();
}

// Busca animal por caravana visual, RFID completo o últimos 8 dígitos.
function buscarAnimalPorIdentificacionEmbarque(identificacion) {
  const animales = obtenerAnimales();
  const valorBuscado = normalizarTextoEmbarque(identificacion);

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];

    const caravanaVisual = normalizarTextoEmbarque(animal.caravanaVisual || "");
    const codigoRFID = normalizarTextoEmbarque(animal.codigoRFID || "");
    const ultimosOchoRFID = codigoRFID.length >= 8
      ? codigoRFID.slice(-8)
      : "";

    if (
      caravanaVisual === valorBuscado ||
      codigoRFID === valorBuscado ||
      ultimosOchoRFID === valorBuscado
    ) {
      return animal;
    }
  }

  return null;
}

// Deja el campo listo para la próxima lectura.
function seleccionarInputBusquedaEmbarque() {
  const inputBusqueda = document.getElementById("identificacionEmbarque");

  if (!inputBusqueda) return;

  setTimeout(function () {
    inputBusqueda.focus();
    inputBusqueda.select();
  }, 200);
}

// Limpia resultado de búsqueda.
function limpiarResultadoBusquedaEmbarque() {
  const resultado = document.getElementById("resultadoBusquedaEmbarque");

  if (!resultado) return;

  resultado.innerHTML = "";
}

// Mensaje simple para búsqueda.
function mostrarResultadoBusquedaEmbarque(texto, tipo) {
  const resultado = document.getElementById("resultadoBusquedaEmbarque");

  if (!resultado) return;

  resultado.innerHTML = `
    <div class="alert alert-${tipo} mb-0">
      ${limpiarTextoEmbarque(texto)}
    </div>
  `;
}

// Carga contadores y listados.
function cargarControlEmbarque() {
  const resultado = obtenerResultadoEmbarque();

  actualizarTextoEmbarque("totalAptosEmbarque", resultado.aptos.length);
  actualizarTextoEmbarque("totalNoAptosEmbarque", resultado.noAptos.length);

  mostrarAnimalesNoAptos(resultado.noAptos);
  mostrarAnimalesAptos(resultado.aptos);
}

// Cambia entre pestañas.
function cambiarTabEmbarque(tab) {
  const btnTabNoAptos = document.getElementById("btnTabNoAptos");
  const btnTabAptos = document.getElementById("btnTabAptos");

  const tabNoAptos = document.getElementById("tabNoAptos");
  const tabAptos = document.getElementById("tabAptos");

  if (!btnTabNoAptos || !btnTabAptos || !tabNoAptos || !tabAptos) {
    return;
  }

  if (tab === "noAptos") {
    btnTabNoAptos.classList.add("activo");
    btnTabAptos.classList.remove("activo");

    tabNoAptos.classList.remove("d-none");
    tabAptos.classList.add("d-none");
  }

  if (tab === "aptos") {
    btnTabNoAptos.classList.remove("activo");
    btnTabAptos.classList.add("activo");

    tabNoAptos.classList.add("d-none");
    tabAptos.classList.remove("d-none");
  }
}

// Devuelve animales aptos y no aptos.
function obtenerResultadoEmbarque() {
  const animales = obtenerAnimales();
  const carenciasActivas = obtenerCarenciasActivasPorAnimal();

  const aptos = [];
  const noAptos = [];

  for (let i = 0; i < animales.length; i++) {
    const animal = animales[i];
    const claveAnimal = obtenerClaveAnimal(animal);
    const carencia = carenciasActivas[claveAnimal];

    if (carencia) {
      noAptos.push({
        animal: animal,
        carencia: carencia
      });
    } else {
      aptos.push(animal);
    }
  }

  return {
    aptos: aptos,
    noAptos: noAptos
  };
}

// Obtiene la carencia activa más larga por animal.
function obtenerCarenciasActivasPorAnimal() {
  const registros = obtenerSanidad();
  const carenciasActivas = {};

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    if (!registro.fechaLiberacion) continue;

    const tieneCarencia = registro.tieneCarencia === true || Number(registro.diasCarencia) > 0;

    if (!tieneCarencia) continue;

    const estado = obtenerEstadoCarenciaEmbarque(registro.fechaLiberacion);

    if (estado !== "En carencia") continue;

    const claveAnimal = obtenerClaveAnimalDesdeSanidad(registro);

    if (!carenciasActivas[claveAnimal]) {
      carenciasActivas[claveAnimal] = registro;
      continue;
    }

    const fechaGuardada = obtenerFechaDesdeISOEmbarque(
      carenciasActivas[claveAnimal].fechaLiberacion
    );

    const fechaNueva = obtenerFechaDesdeISOEmbarque(registro.fechaLiberacion);

    if (fechaNueva > fechaGuardada) {
      carenciasActivas[claveAnimal] = registro;
    }
  }

  return carenciasActivas;
}

// Muestra animales no aptos.
function mostrarAnimalesNoAptos(lista) {
  const contenedor = document.getElementById("listaNoAptosEmbarque");

  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-success mb-0">
        No hay animales bloqueados por carencia sanitaria.
      </div>
    `;
    return;
  }

  for (let i = 0; i < lista.length; i++) {
    const itemLista = lista[i];
    const animal = itemLista.animal;
    const carencia = itemLista.carencia;

    const item = document.createElement("article");
    item.innerHTML = crearHtmlAnimalEmbarqueCompacto(
      animal,
      "noApto",
      carencia,
      false
    );

    contenedor.appendChild(item.firstElementChild);
  }
}

// Muestra animales aptos.
function mostrarAnimalesAptos(lista) {
  const contenedor = document.getElementById("listaAptosEmbarque");

  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div class="alert alert-warning mb-0">
        No hay animales aptos para mostrar.
      </div>
    `;
    return;
  }

  for (let i = 0; i < lista.length; i++) {
    const animal = lista[i];

    const item = document.createElement("article");
    item.innerHTML = crearHtmlAnimalEmbarqueCompacto(
      animal,
      "apto",
      null,
      false
    );

    contenedor.appendChild(item.firstElementChild);
  }
}

// Crea una línea compacta de animal para embarque.
function crearHtmlAnimalEmbarqueCompacto(animal, estado, carencia, esResultadoBusqueda) {
  const esApto = estado === "apto";

  const claseEstado = esApto ? "apto" : "no-apto";
  const textoEstado = esApto ? "APTO" : "NO APTO";
  const iconoEstado = esApto ? "bi-check-circle" : "bi-x-octagon";

  const caravana = animal.caravanaVisual || "Sin caravana";
  const rfid = animal.codigoRFID || "Sin RFID";
  const categoria = animal.categoria || "Sin categoría";
  const sexo = animal.sexo || "Sin sexo";
  const raza = animal.raza || "";
  const campo = animal.campo || "Sin campo";
  const ultimoPeso = obtenerUltimoPesoAnimalEmbarque(animal.id);

  const textoPeso = ultimoPeso
    ? ultimoPeso.pesoKg + " kg"
    : "Sin kg";

  let detalleEstado = "";

  if (esApto) {
    detalleEstado = "Sin carencia sanitaria vigente registrada.";
  } else {
    const diasRestantes = calcularDiasRestantesEmbarque(carencia.fechaLiberacion);

    detalleEstado = `
      Producto: ${limpiarTextoEmbarque(carencia.producto || "Sin dato")} · 
      libera ${formatearFechaEmbarque(carencia.fechaLiberacion)} · 
      restan ${diasRestantes} día(s)
    `;
  }

  const claseResultado = esResultadoBusqueda ? " resultado" : "";

  return `
    <div class="embarque-animal-linea ${claseEstado}${claseResultado}">
      
      <div class="embarque-animal-principal">

        <div class="embarque-animal-identidad">
          <strong>${limpiarTextoEmbarque(caravana)}</strong>
          <span>${limpiarTextoEmbarque(rfid)}</span>
        </div>

        <div class="embarque-animal-estado ${claseEstado}">
          <i class="bi ${iconoEstado}"></i>
          ${textoEstado}
        </div>

      </div>

      <div class="embarque-animal-detalle">
        <span>
          ${limpiarTextoEmbarque(categoria)}
          ·
          ${limpiarTextoEmbarque(sexo)}
          ${raza ? "· " + limpiarTextoEmbarque(raza) : ""}
        </span>

        <span>
          ${limpiarTextoEmbarque(campo)}
        </span>
      </div>

      <div class="embarque-animal-extra">

        <span class="embarque-animal-peso">
          <i class="bi bi-speedometer2"></i>
          ${limpiarTextoEmbarque(textoPeso)}
        </span>

        <span class="embarque-animal-motivo ${claseEstado}">
          ${detalleEstado}
        </span>

      </div>

    </div>
  `;
}

// Obtiene último peso del animal si existe función de pesajes.
function obtenerUltimoPesoAnimalEmbarque(animalId) {
  if (!animalId) return null;

  if (typeof obtenerPesajes !== "function") {
    return null;
  }

  const pesajes = obtenerPesajes();
  const pesajesAnimal = [];

  for (let i = 0; i < pesajes.length; i++) {
    if (pesajes[i].animalId === animalId) {
      pesajesAnimal.push(pesajes[i]);
    }
  }

  if (pesajesAnimal.length === 0) {
    return null;
  }

  pesajesAnimal.sort(function (a, b) {
    const fechaA = new Date(a.fecha || a.fechaRegistro || "");
    const fechaB = new Date(b.fecha || b.fechaRegistro || "");

    return fechaB - fechaA;
  });

  return pesajesAnimal[0];
}

// Devuelve una clave única para un animal.
function obtenerClaveAnimal(animal) {
  if (animal.id) return animal.id;
  if (animal.caravanaVisual) return animal.caravanaVisual;
  if (animal.codigoRFID) return animal.codigoRFID;

  return "animal_sin_id";
}

// Devuelve una clave única desde un registro sanitario.
function obtenerClaveAnimalDesdeSanidad(registro) {
  if (registro.animalId) return registro.animalId;
  if (registro.caravanaVisual) return registro.caravanaVisual;
  if (registro.codigoRFID) return registro.codigoRFID;
  if (registro.identificacion) return registro.identificacion;

  return registro.id;
}

// Devuelve En carencia o Liberado.
function obtenerEstadoCarenciaEmbarque(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraEmbarque(new Date());
  const fecha = obtenerFechaDesdeISOEmbarque(fechaLiberacion);

  if (fecha > hoy) {
    return "En carencia";
  }

  return "Liberado";
}

// Calcula días restantes.
function calcularDiasRestantesEmbarque(fechaLiberacion) {
  const hoy = obtenerFechaSinHoraEmbarque(new Date());
  const fecha = obtenerFechaDesdeISOEmbarque(fechaLiberacion);

  const diferencia = fecha.getTime() - hoy.getTime();
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24));

  if (dias < 0) return 0;

  return dias;
}

// Convierte yyyy-mm-dd a Date local.
function obtenerFechaDesdeISOEmbarque(fechaISO) {
  const partes = fechaISO.split("-");

  const anio = Number(partes[0]);
  const mes = Number(partes[1]) - 1;
  const dia = Number(partes[2]);

  return new Date(anio, mes, dia);
}

// Quita la hora de una fecha.
function obtenerFechaSinHoraEmbarque(fecha) {
  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate()
  );
}

// Formatea yyyy-mm-dd a dd/mm/yyyy.
function formatearFechaEmbarque(fechaISO) {
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
function actualizarTextoEmbarque(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}

// Normaliza texto para comparar.
function normalizarTextoEmbarque(texto) {
  return String(texto)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

// Limpia texto para imprimir en HTML.
function limpiarTextoEmbarque(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Actualiza los datos vivos de la card del usuario en esta pantalla.
function inicializarDatosCabeceraEmbarque() {
  actualizarDatosCabeceraEmbarque();

  setInterval(function () {
    actualizarDatosCabeceraEmbarque();
  }, 1000);
}

function actualizarDatosCabeceraEmbarque() {
  const ahora = new Date();

  actualizarTextoEmbarque("infoDia", obtenerDiaTextoEmbarque(ahora));
  actualizarTextoEmbarque("infoHora", obtenerHoraTextoEmbarque(ahora));
  actualizarTextoEmbarque("infoLuna", obtenerFaseLunarEmbarque(ahora));

  const rotativo = document.getElementById("infoRotativaMobile");

  if (rotativo) {
    rotativo.textContent = "Control de embarque";
  }
}

function obtenerDiaTextoEmbarque(fecha) {
  const opciones = {
    weekday: "long",
    day: "2-digit",
    month: "long"
  };

  let texto = fecha.toLocaleDateString("es-UY", opciones);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function obtenerHoraTextoEmbarque(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerFaseLunarEmbarque(fecha) {
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