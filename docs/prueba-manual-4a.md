# Prueba manual local del bloque 4A

Estado: procedimiento preparado, **no ejecutado en navegador por el agente**.
No utilizar la demo publicada ni credenciales reales para estas pruebas.

## Preparación

1. En la carpeta del proyecto, usar Node 24 y ejecutar `npm test`.
2. Ejecutar `npm run qa:local`. No hace falta `.env.local`: el servidor ignora
   credenciales y siempre crea SQLite sintético en memoria, con las migraciones
   del proyecto. Al detenerlo se pierden solo sus datos de servidor sintéticos.
3. Abrir una pestaña nueva en `http://localhost:43187/`. Es un origen reservado
   para QA, distinto de la demo y de otros localhost. No borrar datos de otro
   origen del navegador. El servidor no sirve `.env`, `.git` ni el respaldo.
4. El adaptador local traduce únicamente el Origin loopback al HTTPS sintético
   de sus handlers. No modifica la cookie Secure ni la configuración productiva.
   Si el navegador rechaza la cookie, registrar el fallo; no desactivar seguridad
   ni saltar advertencias de certificados. Una prueba HTTPS real seguirá pendiente.

## Recorrido reproducible

5. Pulsar **Ejecutar recorrido integral**. El marco carga las pantallas originales;
   el código de QA completa formularios y verifica resultados sobre DOM real.
   Los mensajes alert/confirm se capturan/aceptan solo dentro del laboratorio.
6. Verificar que todas las filas finalicen en OK. El recorrido cubre registro de
   Ana/Bruno, login, animales con API caída, recarga, ficha/listado, pesajes desde
   ambas pantallas, sanidad y carencia, reproducción, embarque, lotes, TXT,
   importación por FileReader, reconexión, expiración, reautenticación, logout,
   aislamiento y caché del service worker.
7. Los resultados sintéticos se guardan en `tests/browser/ultimo-resultado.json`
   y pueden consultarse en `/__prueba__/resultado`. No contienen cookies,
   contraseñas ni hashes. Si hay un fallo, conservar ese resultado; no asumir
   que una prueba posterior pudo validar un módulo que dependía del fallido.
8. Además del recorrido automático, revisar visualmente el marco: menús,
   fichas desplegables, campos, filtros y mensajes. Probar dos anchos de ventana
   y la navegación mediante los enlaces originales, sin modificar el CSS.
9. En la pantalla TXT, usar **Descargar** y abrir el archivo generado: verificar
   delimitadores, caravana/RFID, fecha, hora, guía y cantidad. Probar igualmente
   la exportación del lote. El recorrido comprueba contenido e historial; una
   descarga guardada por el navegador necesita esta revisión manual.
10. Para el selector de archivos nativo, crear un TXT sintético con las líneas
    de `tests/browser/harness.js` y usar **Elegir archivo** en importación y lote.
    El recorrido usa FileReader/DataTransfer, no prueba el diálogo del sistema.

## Offline real y dos pestañas

11. Tras finalizar el recorrido, detener el servidor con Ctrl+C. Mantener abierta
    la pestaña del laboratorio y pulsar **Comprobar recarga con servidor detenido**.
    Debe recargar búsqueda desde SW y encontrar los tres animales de Ana.
    Esta fila queda visible, pero no puede guardarse en el servidor ya detenido:
    registrar su resultado manualmente.
12. Abrir y recargar también sanidad/reproducción/lotes/TXT sin servidor. Deben
    conservar sus datos y permitir operar localmente. No debe desaparecer un
    pendiente por recibir un error de conexión.
13. La DB del laboratorio es efímera. Para probar reconexión con su DB intacta,
    usar la simulación de caída de API del recorrido, no reiniciar el proceso
    esperando conservar los usuarios sintéticos del servidor.
14. Para una revisión de dos pestañas, iniciar sesión online en una cuenta,
    duplicar su pestaña y comprobar que solo una puede editar. Al cerrar la
    primera, recargar la segunda para adquirir el lock. Con otra cuenta, las
    claves locales son distintas, pero la cookie del navegador es compartida:
    la pestaña antigua debe conservar datos y negar sincronización cruzada.
15. Logout debe retirar el perfil activo sin borrar pendientes. Volver a entrar
    con el mismo productor debe recuperarlos. No ofrecer acceso anónimo a otras
    cuentas cacheadas. Verificar cierre de las pestañas de la misma cuenta.

## Criterios de aceptación y pendientes

- Cero errores de JavaScript en consola; todos los pasos aplicables en OK.
- Ningún registro o evento cambia de ID o establecimiento.
- Ningún animal en carencia posterior a su lectura sale en un TXT nuevo.
- Un error HTTP no reemplaza páginas válidas de la caché.
- La instalación móvil/standalone, HTTPS real, comportamiento de permisos y
  lector RFID físico son pruebas adicionales. El manifest sin íconos impide dar
  por certificada la instalación; no confundir funcionamiento offline con
  instalación PWA completa.

Nada de este procedimiento conecta con Turso o autoriza modificar Vercel.
