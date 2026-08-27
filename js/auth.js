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
    transicion.classList.add("saliendo");

    setTimeout(function () {
      callback();
    }, 450);
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