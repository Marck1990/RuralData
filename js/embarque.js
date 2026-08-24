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
      <div class="alert alert-warning mb-0">
        <h3 class="h5 mb-2">
          Animal no encontrado
        </h3>

        <p class="mb-0">
          No existe un animal registrado con la caravana o RFID:
          <strong>${identificacion}</strong>
        </p>
      </div>
    `;

    seleccionarInputBusquedaEmbarque();
    return;
  }

  const carenciasActivas = obtenerCarenciasActivasPorAnimal();
  const claveAnimal = obtenerClaveAnimal(animal);
  const carencia = carenciasActivas[claveAnimal];

  if (carencia) {
    const diasRestantes = calcularDiasRestantesEmbarque(carencia.fechaLiberacion);

    resultado.innerHTML = `
      <div class="alert alert-danger mb-0 resultado-embarque-alerta">
        <div class="d-flex align-items-start gap-3">
          <div class="resultado-embarque-icono">
            <i class="bi bi-x-octagon"></i>
          </div>

          <div>
            <h3 class="h4 mb-2">
              NO APTO PARA EMBARQUE
            </h3>

            <p class="mb-1">
              Animal: <strong>${animal.caravanaVisual || identificacion}</strong>
            </p>

            <p class="mb-1">
              RFID: ${animal.codigoRFID || "Sin dato"}
            </p>

            <p class="mb-1">
              Producto: ${carencia.producto || "Sin dato"}
            </p>

            <p class="mb-1">
              Liberación sanitaria: <strong>${formatearFechaEmbarque(carencia.fechaLiberacion)}</strong>
            </p>

            <p class="mb-0">
              Restan: <strong>${diasRestantes}</strong> día(s)
            </p>
          </div>
        </div>
      </div>
    `;

    cambiarTabEmbarque("noAptos");
    seleccionarInputBusquedaEmbarque();
    return;
  }

  resultado.innerHTML = `
    <div class="alert alert-success mb-0 resultado-embarque-apto">
      <div class="d-flex align-items-start gap-3">
        <div class="resultado-embarque-icono">
          <i class="bi bi-check-circle"></i>
        </div>

        <div>
          <h3 class="h4 mb-2">
            APTO PARA EMBARQUE
          </h3>

          <p class="mb-1">
            Animal: <strong>${animal.caravanaVisual || identificacion}</strong>
          </p>

          <p class="mb-1">
            RFID: ${animal.codigoRFID || "Sin dato"}
          </p>

          <p class="mb-1">
            Categoría: ${animal.categoria || "Sin dato"}
          </p>

          <p class="mb-0">
            No tiene carencia sanitaria vigente registrada en RuralData.
          </p>
        </div>
      </div>
    </div>
  `;

  cambiarTabEmbarque("aptos");
  seleccionarInputBusquedaEmbarque();
}

// Busca animal por caravana visual o RFID.
function buscarAnimalPorIdentificacionEmbarque(identificacion) {
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
      ${texto}
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
    const diasRestantes = calcularDiasRestantesEmbarque(carencia.fechaLiberacion);

    const item = document.createElement("article");
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <span class="estado-pill badge-soft-red mb-3">
          No apto para embarque
        </span>

        <h3 class="h5 mb-2">
          ${animal.caravanaVisual || "Animal sin caravana"}
        </h3>

        <p class="mb-1">
          RFID: ${animal.codigoRFID || "Sin dato"}
        </p>

        <p class="mb-1">
          Categoría: ${animal.categoria || "Sin dato"}
        </p>

        <p class="mb-1">
          Producto: ${carencia.producto || "Sin dato"}
        </p>

        <p class="mb-1">
          Aplicación: ${formatearFechaEmbarque(carencia.fechaAplicacion)}
        </p>

        <p class="mb-1">
          Liberación sanitaria: ${formatearFechaEmbarque(carencia.fechaLiberacion)}
        </p>

        <p class="mb-0">
          Restan: <strong>${diasRestantes}</strong> día(s)
        </p>
      </div>
    `;

    contenedor.appendChild(item);
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
    item.className = "card";

    item.innerHTML = `
      <div class="card-body">
        <span class="estado-pill badge-soft-green mb-3">
          Apto según registros locales
        </span>

        <h3 class="h5 mb-2">
          ${animal.caravanaVisual || "Animal sin caravana"}
        </h3>

        <p class="mb-1">
          RFID: ${animal.codigoRFID || "Sin dato"}
        </p>

        <p class="mb-1">
          Categoría: ${animal.categoria || "Sin dato"}
        </p>

        <p class="mb-1">
          Sexo: ${animal.sexo || "Sin dato"}
        </p>

        <p class="mb-0">
          Campo: ${animal.campo || "Sin dato"}
        </p>
      </div>
    `;

    contenedor.appendChild(item);
  }
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