// Manejo de usuarios, roles e inicio de sesión.

document.addEventListener("DOMContentLoaded", () => {
  inicializarUsuarios();

  const formLogin = document.getElementById("formLogin");

  if (formLogin) {
    formLogin.addEventListener("submit", iniciarSesion);
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

function protegerPagina() {
  const esLogin = window.location.pathname.includes("login.html");
  const sesion = obtenerSesion();

  if (!sesion && !esLogin) {
    window.location.href = obtenerRutaLogin();
  }

  if (sesion && esLogin) {
    window.location.href = "index.html";
  }
}

function mostrarUsuarioActivo() {
  const sesion = obtenerSesion();
  const contenedor = document.getElementById("usuarioActivo");

  if (!sesion || !contenedor) return;

  contenedor.innerHTML = `
    <div class="alert alert-success py-2 mb-3">
      <strong>${sesion.nombre}</strong><br>
      Rol: ${formatearRol(sesion.rol)}
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