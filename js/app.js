// Carga los datos principales del inicio de RuralData.

document.addEventListener("DOMContentLoaded", () => {
  actualizarDashboard();
});

function actualizarDashboard() {
  const animales = obtenerAnimales();
  const sanidad = obtenerSanidad();

  const totalAnimales = document.getElementById("totalAnimales");
  const totalSanidad = document.getElementById("totalSanidad");

  if (totalAnimales) {
    totalAnimales.textContent = animales.length;
  }

  if (totalSanidad) {
    totalSanidad.textContent = sanidad.length;
  }
}



if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .then(() => console.log("Service Worker registrado"))
    .catch(error => console.log("Error al registrar Service Worker", error));
}