// Módulo de identificación animal.
// Hoy permite carga manual.
// Queda preparado para RFID, bastón o importación futura.

const MetodoIngreso = {
  MANUAL: "manual",
  BASTON_TECLADO: "baston-teclado",
  ARCHIVO_IMPORTADO: "archivo-importado",
  BLUETOOTH: "bluetooth"
};

function crearIdentificacion(caravanaVisual, codigoRFID = "") {
  return {
    caravanaVisual: caravanaVisual.trim(),
    codigoRFID: codigoRFID.trim(),
    metodoIngreso: MetodoIngreso.MANUAL
  };
}

function identificacionEsValida(identificacion) {
  return (
    identificacion.caravanaVisual !== "" ||
    identificacion.codigoRFID !== ""
  );
}