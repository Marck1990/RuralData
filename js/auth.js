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

  if (usuarios.length > 0) return;

  const usuariosIniciales = [
    {
      id: crypto.randomUUID(),
      nombre: "Propietario Demo",
      usuario: "propietario",
      password: "1234",
      rol: "propietario"
    },
    {
      id: crypto.randomUUID(),
      nombre: "Trabajador Demo",
      usuario: "trabajador",
      password: "1234",
      rol: "trabajador"
    },
    {
      id: crypto.randomUUID(),
      nombre: "Veterinario Demo",
      usuario: "veterinario",
      password: "1234",
      rol: "veterinario"
    }
  ];

  guardarUsuarios(usuariosIniciales);
}

function iniciarSesion(event) {
  event.preventDefault();

  const usuarioIngresado = document.getElementById("usuario").value.trim();
  const passwordIngresado = document.getElementById("password").value.trim();
  const mensaje = document.getElementById("mensajeLogin");

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

  guardarSesion({
    id: usuarioEncontrado.id,
    nombre: usuarioEncontrado.nombre,
    usuario: usuarioEncontrado.usuario,
    rol: usuarioEncontrado.rol
  });

  window.location.href = "index.html";
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

  const nuevoUsuario = {
    id: crypto.randomUUID(),
    nombre,
    usuario,
    password,
    rol
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