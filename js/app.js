// Carga los datos principales del dashboard de RuralData.

let datosRotativosCabecera = [];
let indiceDatoRotativo = 0;

document.addEventListener("DOMContentLoaded", function () {
  actualizarDashboard();
  inicializarFotoPerfil();
  inicializarMenuLateral();
  inicializarDatosVivosCabecera();
});

// Actualiza los números, bienvenida y gráficas del inicio.
function actualizarDashboard() {
  const animales = obtenerAnimales();
  const sanidad = obtenerSanidad();
  const reproduccion = obtenerReproduccion();
  const sesion = obtenerSesion();

  mostrarBienvenida(sesion);

  actualizarTexto("totalAnimales", animales.length);
  actualizarTexto("totalSanidad", sanidad.length);
  actualizarTexto("totalPariciones", calcularProximasPariciones(reproduccion));
  actualizarTexto("totalAlertas", calcularAlertasPendientes(sanidad, reproduccion));

  crearGraficaBarras("graficaCategorias", contarPorCampo(animales, "categoria"));
  crearGraficaBarras("graficaControles", contarPorCampo(sanidad, "tipoControl"));
  crearGraficaBarras("graficaReproduccion", contarPorCampo(reproduccion, "estadoReproductivo"));
}

// Muestra el nombre del usuario activo en la cabecera.
function mostrarBienvenida(sesion) {
  const tituloBienvenida = document.getElementById("tituloBienvenida");

  if (!tituloBienvenida || !sesion) return;

  tituloBienvenida.textContent = "Bienvenido, " + sesion.nombre + " a RuralData";
}

// Cambia el texto de un elemento si existe.
function actualizarTexto(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}

// Inicializa día, hora, luna y dato rotativo en celular.
function inicializarDatosVivosCabecera() {
  actualizarDatosVivosCabecera();
  actualizarDatoRotativoMobile();

  setInterval(function () {
    actualizarDatosVivosCabecera();
  }, 1000);

  setInterval(function () {
    actualizarDatoRotativoMobile();
  }, 3000);
}

// Actualiza los datos visibles de la cabecera.
function actualizarDatosVivosCabecera() {
  const ahora = new Date();

  const diaTexto = obtenerDiaTexto(ahora);
  const horaTexto = obtenerHoraTexto(ahora);
  const lunaTexto = obtenerFaseLunar(ahora);

  actualizarTexto("infoDia", diaTexto);
  actualizarTexto("infoHora", horaTexto);
  actualizarTexto("infoLuna", lunaTexto);

  datosRotativosCabecera = [
    "Día · " + diaTexto,
    "Hora · " + horaTexto,
    "Luna · " + lunaTexto
  ];
}

// Actualiza el dato rotativo solo para celular.
function actualizarDatoRotativoMobile() {
  const contenedor = document.getElementById("infoRotativaMobile");

  if (!contenedor || datosRotativosCabecera.length === 0) return;

  contenedor.classList.remove("animar");

  void contenedor.offsetWidth;

  contenedor.textContent = datosRotativosCabecera[indiceDatoRotativo];
  contenedor.classList.add("animar");

  indiceDatoRotativo++;

  if (indiceDatoRotativo >= datosRotativosCabecera.length) {
    indiceDatoRotativo = 0;
  }
}

// Devuelve el día actual en formato legible.
function obtenerDiaTexto(fecha) {
  const opciones = {
    weekday: "long",
    day: "2-digit",
    month: "long"
  };

  let texto = fecha.toLocaleDateString("es-UY", opciones);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Devuelve la hora actual.
function obtenerHoraTexto(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Calcula una fase lunar aproximada.
function obtenerFaseLunar(fecha) {
  const lunaNuevaReferencia = new Date("2000-01-06T18:14:00Z");
  const cicloLunar = 29.53058867;

  const diferenciaTiempo = fecha.getTime() - lunaNuevaReferencia.getTime();
  const diasPasados = diferenciaTiempo / (1000 * 60 * 60 * 24);

  let fase = (diasPasados % cicloLunar) / cicloLunar;

  if (fase < 0) {
    fase = fase + 1;
  }

  if (fase < 0.03 || fase > 0.97) {
    return "Luna nueva";
  }

  if (fase < 0.22) {
    return "Luna creciente";
  }

  if (fase < 0.28) {
    return "Cuarto creciente";
  }

  if (fase < 0.47) {
    return "Gibosa creciente";
  }

  if (fase < 0.53) {
    return "Luna llena";
  }

  if (fase < 0.72) {
    return "Gibosa menguante";
  }

  if (fase < 0.78) {
    return "Cuarto menguante";
  }

  return "Luna menguante";
}

// Inicializa la carga de foto de perfil.
function inicializarFotoPerfil() {
  const inputFotoPerfil = document.getElementById("inputFotoPerfil");
  const fotoPerfilUsuario = document.getElementById("fotoPerfilUsuario");
  const iconoPerfilUsuario = document.getElementById("iconoPerfilUsuario");
  const sesion = obtenerSesion();

  if (!inputFotoPerfil || !fotoPerfilUsuario || !iconoPerfilUsuario || !sesion) {
    return;
  }

  cargarFotoPerfilGuardada(sesion, fotoPerfilUsuario, iconoPerfilUsuario);

  inputFotoPerfil.addEventListener("change", function () {
    const archivo = inputFotoPerfil.files[0];

    if (!archivo) return;

    if (!archivo.type.startsWith("image/")) {
      alert("Debe seleccionar una imagen.");
      inputFotoPerfil.value = "";
      return;
    }

    const lector = new FileReader();

    lector.onload = function (evento) {
      const imagenBase64 = evento.target.result;

      guardarFotoPerfil(sesion, imagenBase64);
      mostrarFotoPerfil(imagenBase64, fotoPerfilUsuario, iconoPerfilUsuario);
      cerrarMenuLateral();
    };

    lector.readAsDataURL(archivo);
  });
}

// Carga la foto guardada desde localStorage.
function cargarFotoPerfilGuardada(sesion, fotoPerfilUsuario, iconoPerfilUsuario) {
  const claveFoto = obtenerClaveFotoPerfil(sesion);
  const fotoGuardada = localStorage.getItem(claveFoto);

  if (!fotoGuardada) return;

  mostrarFotoPerfil(fotoGuardada, fotoPerfilUsuario, iconoPerfilUsuario);
}

// Guarda la foto de perfil por usuario.
function guardarFotoPerfil(sesion, imagenBase64) {
  const claveFoto = obtenerClaveFotoPerfil(sesion);

  localStorage.setItem(claveFoto, imagenBase64);
}

// Muestra la foto y oculta el icono.
function mostrarFotoPerfil(imagenBase64, fotoPerfilUsuario, iconoPerfilUsuario) {
  fotoPerfilUsuario.src = imagenBase64;
  fotoPerfilUsuario.classList.remove("d-none");
  iconoPerfilUsuario.classList.add("d-none");
}

// Devuelve una clave única para cada usuario.
function obtenerClaveFotoPerfil(sesion) {
  return "ruraldata_foto_perfil_" + sesion.id;
}

// Inicializa el menú lateral tipo drawer.
function inicializarMenuLateral() {
  const btnAbrir = document.getElementById("btnAbrirMenuLateral");
  const btnCerrar = document.getElementById("btnCerrarMenuLateral");
  const overlay = document.getElementById("overlayMenuLateral");
  const menu = document.getElementById("menuLateralRural");

  if (!menu || !overlay) return;

  if (btnAbrir) {
    btnAbrir.addEventListener("click", abrirMenuLateral);
  }

  if (btnCerrar) {
    btnCerrar.addEventListener("click", cerrarMenuLateral);
  }

  overlay.addEventListener("click", cerrarMenuLateral);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      cerrarMenuLateral();
    }
  });

  inicializarGestosMenuLateral();
}

// Abre el menú lateral.
function abrirMenuLateral() {
  const overlay = document.getElementById("overlayMenuLateral");
  const menu = document.getElementById("menuLateralRural");

  if (!overlay || !menu) return;

  menu.classList.add("abierto");
  overlay.classList.add("activo");
  document.body.classList.add("menu-lateral-abierto");
}

// Cierra el menú lateral.
function cerrarMenuLateral() {
  const overlay = document.getElementById("overlayMenuLateral");
  const menu = document.getElementById("menuLateralRural");

  if (!overlay || !menu) return;

  menu.classList.remove("abierto");
  overlay.classList.remove("activo");
  document.body.classList.remove("menu-lateral-abierto");
}

// Permite abrir el menú deslizando desde el borde izquierdo.
function inicializarGestosMenuLateral() {
  let inicioX = 0;
  let inicioY = 0;
  let finX = 0;
  let finY = 0;
  let gestoDesdeBorde = false;

  document.addEventListener("touchstart", function (event) {
    if (!event.touches || event.touches.length === 0) return;

    inicioX = event.touches[0].clientX;
    inicioY = event.touches[0].clientY;
    gestoDesdeBorde = inicioX <= 28;
  });

  document.addEventListener("touchend", function (event) {
    if (!event.changedTouches || event.changedTouches.length === 0) return;

    finX = event.changedTouches[0].clientX;
    finY = event.changedTouches[0].clientY;

    const movimientoX = finX - inicioX;
    const movimientoY = Math.abs(finY - inicioY);

    const menu = document.getElementById("menuLateralRural");

    if (!menu) return;

    const menuAbierto = menu.classList.contains("abierto");

    if (gestoDesdeBorde && movimientoX > 75 && movimientoY < 90) {
      abrirMenuLateral();
    }

    if (menuAbierto && movimientoX < -75 && movimientoY < 90) {
      cerrarMenuLateral();
    }
  });
}

// Cuenta próximas pariciones según fecha estimada.
function calcularProximasPariciones(registros) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let cantidad = 0;

  for (let i = 0; i < registros.length; i++) {
    const registro = registros[i];

    if (!registro.fechaEstimadaParto) continue;

    const fechaParto = new Date(registro.fechaEstimadaParto);
    fechaParto.setHours(0, 0, 0, 0);

    if (fechaParto >= hoy) {
      cantidad++;
    }
  }

  return cantidad;
}

// Cuenta alertas por sanidad vencida o pariciones cercanas.
function calcularAlertasPendientes(sanidad, reproduccion) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  let alertas = 0;

  for (let i = 0; i < sanidad.length; i++) {
    const control = sanidad[i];

    if (!control.fechaProxima) continue;

    const fechaProxima = new Date(control.fechaProxima);
    fechaProxima.setHours(0, 0, 0, 0);

    if (fechaProxima <= hoy) {
      alertas++;
    }
  }

  for (let i = 0; i < reproduccion.length; i++) {
    const registro = reproduccion[i];

    if (!registro.fechaEstimadaParto) continue;

    const fechaParto = new Date(registro.fechaEstimadaParto);
    fechaParto.setHours(0, 0, 0, 0);

    const diferenciaTiempo = fechaParto.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diferenciaTiempo / (1000 * 60 * 60 * 24));
    const diasAviso = Number(registro.diasAviso) || 15;

    if (diasRestantes <= diasAviso) {
      alertas++;
    }
  }

  return alertas;
}

// Cuenta registros agrupados por un campo.
function contarPorCampo(lista, campo) {
  const resultado = {};

  for (let i = 0; i < lista.length; i++) {
    let valor = lista[i][campo];

    if (!valor || valor.trim() === "") {
      valor = "Sin dato";
    }

    if (!resultado[valor]) {
      resultado[valor] = 0;
    }

    resultado[valor]++;
  }

  return resultado;
}

// Crea una gráfica simple de barras adaptable al celular.
function crearGraficaBarras(idContenedor, datos) {
  const contenedor = document.getElementById(idContenedor);

  if (!contenedor) return;

  contenedor.innerHTML = "";

  const claves = Object.keys(datos);

  if (claves.length === 0) {
    contenedor.innerHTML = `
      <div class="app-rural-chart-empty">
        Todavía no hay datos para mostrar.
      </div>
    `;
    return;
  }

  let total = 0;

  for (let i = 0; i < claves.length; i++) {
    total += datos[claves[i]];
  }

  for (let i = 0; i < claves.length; i++) {
    const nombre = claves[i];
    const cantidad = datos[nombre];
    const porcentaje = Math.round((cantidad * 100) / total);

    const fila = document.createElement("div");
    fila.className = "app-rural-chart-row";

    fila.innerHTML = `
      <div class="app-rural-chart-info">
        <span>${nombre}</span>
        <span>${cantidad} · ${porcentaje}%</span>
      </div>

      <div class="app-rural-chart-bar">
        <div class="app-rural-chart-fill" style="width: ${porcentaje}%"></div>
      </div>
    `;

    contenedor.appendChild(fila);
  }
}

// Registro del service worker para funcionamiento PWA.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(function () {
      console.log("Service Worker registrado");
    })
    .catch(function (error) {
      console.log("Error al registrar Service Worker", error);
    });
}