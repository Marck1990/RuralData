// Manejo de usuarios, roles, registro e inicio de sesión.

document.addEventListener("DOMContentLoaded", () => {
  inicializarUsuarios();

  const formLogin = document.getElementById("formLogin");
  const formRegistroUsuario = document.getElementById("formRegistroUsuario");

  if (formLogin) {
    formLogin.addEventListener("submit", iniciarSesion);
  }

  if (formRegistroUsuario) {
    formRegistroUsuario.addEventListener("submit", registrarUsuario);
  }

  protegerPagina();
  mostrarUsuarioActivo();
  controlarAccesosPorRol();
  aplicarAnimacionEntradaDashboard();

  const btnCerrarSesion = document.getElementById("btnCerrarSesion");

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener("click", cerrarSesion);
  }
});

function inicializarUsuarios() {
  const usuarios = obtenerUsuarios();

  if (usuarios.length > 0) {
    normalizarUsuariosExistentes(usuarios);
    return;
  }

  const usuariosIniciales = [
    {
      id: crypto.randomUUID(),
      nombre: "Propietario Demo",
      usuario: "propietario",
      password: "1234",
      rol: "propietario",
      establecimientoId: crypto.randomUUID()
    },
    {
      id: crypto.randomUUID(),
      nombre: "Trabajador Demo",
      usuario: "trabajador",
      password: "1234",
      rol: "trabajador",
      establecimientoId: crypto.randomUUID()
    },
    {
      id: crypto.randomUUID(),
      nombre: "Veterinario Demo",
      usuario: "veterinario",
      password: "1234",
      rol: "veterinario",
      establecimientoId: crypto.randomUUID()
    }
  ];

  guardarUsuarios(usuariosIniciales);
}

// Agrega establecimientoId a usuarios viejos que no lo tenían.
function normalizarUsuariosExistentes(usuarios) {
  let huboCambios = false;

  for (let i = 0; i < usuarios.length; i++) {
    if (!usuarios[i].establecimientoId) {
      usuarios[i].establecimientoId = "establecimiento_usuario_" + usuarios[i].id;
      huboCambios = true;
    }
  }

  if (huboCambios) {
    guardarUsuarios(usuarios);
  }
}

function iniciarSesion(event) {
  event.preventDefault();

  const usuarioIngresado = document.getElementById("usuario").value.trim();
  const passwordIngresado = document.getElementById("password").value.trim();
  const mensaje = document.getElementById("mensajeLogin");
  const btnIngresar = document.getElementById("btnIngresarLogin");

  const usuarios = obtenerUsuarios();

  const usuarioEncontrado = usuarios.find(usuario =>
    usuario.usuario === usuarioIngresado &&
    usuario.password === passwordIngresado
  );

  if (!usuarioEncontrado) {
    mensaje.innerHTML = `
      <div class="alert alert-danger">
        Usuario o contraseña incorrectos.
      </div>
    `;
    return;
  }

  if (btnIngresar) {
    btnIngresar.disabled = true;
    btnIngresar.textContent = "Ingresando...";
  }

  if (!usuarioEncontrado.establecimientoId) {
    usuarioEncontrado.establecimientoId = "establecimiento_usuario_" + usuarioEncontrado.id;
    guardarUsuarios(usuarios);
  }

  guardarSesion({
    id: usuarioEncontrado.id,
    nombre: usuarioEncontrado.nombre,
    usuario: usuarioEncontrado.usuario,
    rol: usuarioEncontrado.rol,
    establecimientoId: usuarioEncontrado.establecimientoId
  });

  mostrarTransicionLogin(function () {
    window.location.href = "index.html";
  });
}

// Muestra la transición visual entre login y dashboard.
// Muestra la transición visual entre login y dashboard.
function mostrarTransicionLogin(callback) {
  const transicion = document.getElementById("transicionLogin");
  const video = document.getElementById("videoTransicionLogin");

  if (!transicion) {
    callback();
    return;
  }

  transicion.classList.add("activo");

  let yaRedirigio = false;

  function continuar() {
    if (yaRedirigio) return;

    yaRedirigio = true;

    /*
      Marcamos que el dashboard debe entrar con animación.
      Esto se lee al cargar index.html.
    */
    sessionStorage.setItem("ruraldata_animar_dashboard", "true");

    /*
      No apagamos la transición antes de cambiar de página.
      Así evitamos que se vea otra vez el login antes del dashboard.
    */
    callback();
  }

  if (video) {
    video.currentTime = 0;

    const promesaVideo = video.play();

    if (promesaVideo && promesaVideo.catch) {
      promesaVideo.catch(function () {
        setTimeout(continuar, 2500);
      });
    }

    video.onended = function () {
      continuar();
    };

    setTimeout(function () {
      continuar();
    }, 5200);

    return;
  }

  setTimeout(continuar, 2800);
}




function registrarUsuario(event) {
  event.preventDefault();

  const nombre = document.getElementById("nombreRegistro").value.trim();
  const usuario = document.getElementById("usuarioRegistro").value.trim();
  const password = document.getElementById("passwordRegistro").value.trim();
  const rol = document.getElementById("rolRegistro").value;
  const mensaje = document.getElementById("mensajeRegistroUsuario");

  const usuarios = obtenerUsuarios();

  const existeUsuario = usuarios.some(u => u.usuario === usuario);

  if (existeUsuario) {
    mensaje.innerHTML = `
      <div class="alert alert-danger">
        Ese usuario ya existe.
      </div>
    `;
    return;
  }

  const nuevoUsuarioId = crypto.randomUUID();

  const nuevoUsuario = {
    id: nuevoUsuarioId,
    nombre,
    usuario,
    password,
    rol,
    establecimientoId: "establecimiento_usuario_" + nuevoUsuarioId
  };

  usuarios.push(nuevoUsuario);
  guardarUsuarios(usuarios);

  mensaje.innerHTML = `
    <div class="alert alert-success">
      Usuario creado correctamente.
    </div>
  `;

  event.target.reset();

  setTimeout(() => {
    window.location.href = "login.html";
  }, 1200);
}

function protegerPagina() {
  const ruta = window.location.pathname;
  const esLogin = ruta.includes("login.html");
  const esRegistro = ruta.includes("registro-usuario.html");
  const esPaginaPublica = esLogin || esRegistro;

  const sesion = obtenerSesion();

  if (!sesion && !esPaginaPublica) {
    window.location.href = obtenerRutaLogin();
  }

  if (sesion && esPaginaPublica) {
    window.location.href = "index.html";
  }
}

function mostrarUsuarioActivo() {
  const sesion = obtenerSesion();
  const contenedor = document.getElementById("usuarioActivo");

  if (!sesion || !contenedor) return;

  const ruta = window.location.pathname;
  const esPaginaInterna = ruta.includes("/pages/");

  if (esPaginaInterna) {
    contenedor.innerHTML = `
    <div class="widget-accion-ruraldata">

      <div class="widget-accion-ruraldata-fijos">

        <div class="widget-accion-ruraldata-dato">
          <span>Día</span>
          <strong id="accionInfoDia">Cargando...</strong>
        </div>

        <div class="widget-accion-ruraldata-dato">
          <span>Clima</span>
          <strong id="accionInfoClima">Sin conexión</strong>
        </div>

      </div>

      <div class="widget-accion-ruraldata-rotativo">
        <span id="accionRotativoTitulo">Hora</span>
        <strong id="accionRotativoValor">--:--</strong>
      </div>

      <span id="accionInfoHora" class="d-none">--:--</span>
      <span id="accionInfoTemp" class="d-none">--°C</span>
      <span id="accionInfoLuna" class="d-none">Calculando...</span>

    </div>
  `;

    inicializarWidgetAccionRuralData();
    return;
  }

  contenedor.innerHTML = `
    <div class="app-rural-user-card">

      <div class="app-rural-user-card-info">
        <strong>${sesion.nombre}</strong>
        <span>Rol: ${formatearRol(sesion.rol)}</span>
      </div>

      <div class="app-rural-user-card-live">

        <div class="app-rural-live-desktop">

          <article class="app-rural-live-card">
            <i class="bi bi-calendar3"></i>

            <div>
              <span>Día</span>
              <strong id="infoDia">Cargando...</strong>
            </div>
          </article>

          <article class="app-rural-live-card">
            <i class="bi bi-clock"></i>

            <div>
              <span>Hora</span>
              <strong id="infoHora">--:--</strong>
            </div>
          </article>

          <article class="app-rural-live-card">
            <i class="bi bi-moon-stars"></i>

            <div>
              <span>Luna</span>
              <strong id="infoLuna">Calculando...</strong>
            </div>
          </article>

        </div>

        <div class="app-rural-live-mobile">
          <div id="infoRotativaMobile" class="app-rural-live-mobile-card">
            Cargando datos...
          </div>
        </div>

      </div>

    </div>
  `;
}




// Widget compacto para páginas internas de RuralData.
// Queda preparado para conectar clima/temperatura con Capacitor más adelante.

let indiceWidgetAccionRotativo = 0;

function inicializarWidgetAccionRuralData() {
  actualizarWidgetAccionRuralData();
  actualizarRotativoWidgetAccion();

  setInterval(function () {
    actualizarWidgetAccionRuralData();
  }, 1000);

  setInterval(function () {
    indiceWidgetAccionRotativo++;

    if (indiceWidgetAccionRotativo > 2) {
      indiceWidgetAccionRotativo = 0;
    }

    actualizarRotativoWidgetAccion();
  }, 3500);
}

function actualizarWidgetAccionRuralData() {
  const ahora = new Date();

  const dia = obtenerDiaCortoWidgetAccion(ahora);
  const hora = obtenerHoraWidgetAccion(ahora);
  const luna = obtenerFaseLunarWidgetAccion(ahora);

  const clima = "Sin conexión";
  const temperatura = "--°C";

  actualizarTextoWidgetAccion("accionInfoDia", dia);
  actualizarTextoWidgetAccion("accionInfoClima", clima);
  actualizarTextoWidgetAccion("accionInfoHora", hora);
  actualizarTextoWidgetAccion("accionInfoTemp", temperatura);
  actualizarTextoWidgetAccion("accionInfoLuna", luna);
}


function actualizarRotativoWidgetAccion() {
  const titulo = document.getElementById("accionRotativoTitulo");
  const valor = document.getElementById("accionRotativoValor");

  if (!titulo || !valor) return;

  const hora = document.getElementById("accionInfoHora");
  const temp = document.getElementById("accionInfoTemp");
  const luna = document.getElementById("accionInfoLuna");

  const datos = [
    {
      titulo: "Hora",
      valor: hora ? hora.textContent : "--:--"
    },
    {
      titulo: "Temp",
      valor: temp ? temp.textContent : "--°C"
    },
    {
      titulo: "Luna",
      valor: luna ? luna.textContent : "Calculando..."
    }
  ];

  const datoActual = datos[indiceWidgetAccionRotativo];

  titulo.textContent = datoActual.titulo;
  valor.textContent = datoActual.valor;

  valor.classList.remove("animar-widget-accion");

  setTimeout(function () {
    valor.classList.add("animar-widget-accion");
  }, 20);
}

function actualizarTextoWidgetAccion(idElemento, valor) {
  const elemento = document.getElementById(idElemento);

  if (!elemento) return;

  elemento.textContent = valor;
}

function obtenerDiaCortoWidgetAccion(fecha) {
  const dias = ["D", "L", "M", "M", "J", "V", "S"];
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "setiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  const diaSemana = dias[fecha.getDay()];
  const diaMes = fecha.getDate();
  const mes = meses[fecha.getMonth()];

  return diaSemana + "/" + diaMes + "/" + mes;
}

function obtenerHoraWidgetAccion(fecha) {
  return fecha.toLocaleTimeString("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function obtenerFaseLunarWidgetAccion(fecha) {
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



function controlarAccesosPorRol() {
  const sesion = obtenerSesion();

  if (!sesion) return;

  const elementos = document.querySelectorAll("[data-roles]");

  elementos.forEach(elemento => {
    const rolesPermitidos = elemento.dataset.roles.split(",");

    if (!rolesPermitidos.includes(sesion.rol)) {
      elemento.remove();
    }
  });
}

function cerrarSesion() {
  cerrarSesionLocal();
  window.location.href = obtenerRutaLogin();
}

function obtenerRutaLogin() {
  const estaEnPages = window.location.pathname.includes("/pages/");
  return estaEnPages ? "../login.html" : "login.html";
}

function formatearRol(rol) {
  if (rol === "propietario") return "Propietario";
  if (rol === "trabajador") return "Trabajador";
  if (rol === "veterinario") return "Veterinario";
  return rol;
}


// Aplica una entrada suave al dashboard después del video de login.
function aplicarAnimacionEntradaDashboard() {
  const debeAnimar = sessionStorage.getItem("ruraldata_animar_dashboard");

  if (debeAnimar !== "true") return;

  sessionStorage.removeItem("ruraldata_animar_dashboard");

  document.body.classList.add("dashboard-entrada-activa");

  setTimeout(function () {
    document.body.classList.remove("dashboard-entrada-activa");
  }, 1400);
}


// Inserta la lengüeta superior de RuralData en pantallas internas.
function insertarLenguetaInternaRuralData() {
  const body = document.body;

  if (!body) return;

  const esLogin = body.classList.contains("login-rural-body");
  const esDashboard = body.classList.contains("app-rural-body");

  if (esLogin || esDashboard) return;

  const yaExiste = document.getElementById("lenguetaInternaRuralData");

  if (yaExiste) return;

  const lengueta = document.createElement("header");
  lengueta.id = "lenguetaInternaRuralData";
  lengueta.className = "lengueta-interna-ruraldata";

  lengueta.innerHTML = `
    <div class="lengueta-interna-ruraldata-acciones">
      <a
        href="../index.html"
        class="lengueta-interna-ruraldata-btn"
        aria-label="Volver al inicio"
      >
        <i class="bi bi-house-door"></i>
      </a>
    </div>

    <div class="lengueta-interna-ruraldata-logo-wrap">
      <img
        src="../assets/img/logo-ruraldata.webp"
        alt="RuralData"
        class="lengueta-interna-ruraldata-logo"
      />
    </div>

    <div class="lengueta-interna-ruraldata-espacio"></div>
  `;

  body.insertBefore(lengueta, body.firstChild);
}



// Inicializa transiciones laterales entre dashboard y pantallas internas.
let transicionRuralDataEnCurso = false;

function inicializarTransicionesRuralData() {
  const body = document.body;

  if (!body) return;

  if (body.classList.contains("login-rural-body")) {
    return;
  }

  aplicarEntradaTransicionRuralData();

  document.addEventListener("click", function (event) {
    const enlace = event.target.closest("a");

    if (!enlace) return;

    if (!enlaceEsNavegacionInternaRuralData(enlace)) {
      return;
    }

    if (transicionRuralDataEnCurso) {
      return;
    }

    event.preventDefault();

    transicionRuralDataEnCurso = true;

    sessionStorage.setItem("ruraldata_transicion_slide", "true");

    animarAccionMenuLateralRuralData(enlace);

    document.body.classList.add("transicion-salida-ruraldata");

    setTimeout(function () {
      window.location.href = enlace.href;
    }, 260);
  });
}

// Aplica animación al entrar a una nueva pantalla.
function aplicarEntradaTransicionRuralData() {
  const debeAnimar = sessionStorage.getItem("ruraldata_transicion_slide");

  if (debeAnimar !== "true") {
    return;
  }

  sessionStorage.removeItem("ruraldata_transicion_slide");

  document.body.classList.add("transicion-entrada-ruraldata");

  setTimeout(function () {
    document.body.classList.remove("transicion-entrada-ruraldata");
  }, 420);
}

// Revisa si el link pertenece a la app y puede tener transición.
function enlaceEsNavegacionInternaRuralData(enlace) {
  const href = enlace.getAttribute("href");

  if (!href) return false;
  if (href === "#") return false;
  if (href.startsWith("#")) return false;
  if (href.startsWith("mailto:")) return false;
  if (href.startsWith("tel:")) return false;
  if (href.startsWith("javascript:")) return false;

  if (enlace.target && enlace.target !== "_self") return false;
  if (enlace.hasAttribute("download")) return false;
  if (enlace.classList.contains("sin-transicion")) return false;

  const urlDestino = new URL(enlace.href, window.location.href);

  if (urlDestino.origin !== window.location.origin) {
    return false;
  }

  if (
    urlDestino.pathname === window.location.pathname &&
    urlDestino.hash !== ""
  ) {
    return false;
  }

  return true;
}



// Anima la acción seleccionada del menú lateral antes de cambiar de pantalla.
function animarAccionMenuLateralRuralData(enlace) {
  if (!enlace) return;

  const menuLateral = enlace.closest("aside");

  if (!menuLateral) return;

  enlace.classList.add("accion-menu-lateral-saliendo");
  menuLateral.classList.add("menu-lateral-en-transicion");
}



document.addEventListener("DOMContentLoaded", function () {
  insertarLenguetaInternaRuralData();
  inicializarTransicionesRuralData();
});