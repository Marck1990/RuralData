# Bloque 4A — Verificación integral de RuralData 1.0

## Resultado y límite de esta verificación

Trabajo local en `mvp/ruraldata-1-persistencia`. No se abrió Turso, no se modificó
Vercel, no hubo despliegue ni se abrió/modificó el respaldo descargado.

**No se completó un recorrido en navegador real.** La herramienta de control de
Chrome detuvo el intento antes de realizar acciones porque no pudo determinar la
URL con confianza suficiente para aplicar su política de seguridad. No se
eludió esa protección. El laboratorio de navegador quedó preparado, no ejecutado.

Sí se ejecutaron pruebas automatizadas con datos sintéticos, SQLite real local,
DOM/caché simulados y el cliente libSQL local. También se hizo una comprobación
HTTP real contra el servidor loopback sintético. Son evidencias diferentes de
una prueba visual, de instalación PWA o de cookies aplicada por Chrome.

## Revisión del diff

Base: commit original `382066f` en la rama de trabajo. Se revisaron el diff,
inventario de funciones y los identificadores de formularios de los archivos
versionados; los nuevos módulos se revisaron mediante sus fuentes y pruebas.

- Se conservan todas las pantallas productivas, sus formularios, botones y lógica
  de registro/búsqueda/ficha/listado/pesajes/sanidad/reproducción/embarque/lotes/TXT.
  No hay cambios en CSS ni recursos de marca.
- Las funciones retiradas de `animales.js` y `listados.js` eran acceso remoto,
  conversión y mezcla por caravana/RFID. Sus responsabilidades pasaron al contrato
  compartido, persistencia y sincronizador. No se retiraron funciones de pesajes
  ni de fichas. La mezcla anterior podía cambiar IDs y pisar pendientes.
- Las funciones retiradas de `auth.js` creaban usuarios demo, normalizaban sus
  cuentas locales o aplicaban roles. Es una sustitución intencional por registro
  y login de productores independientes, no una baja de módulos productivos.
- En HTML solo desaparece el campo `rolRegistro`; se agrega establecimiento al
  registro, se usa email para login y se cargan los módulos comunes. Se quitaron
  atributos de roles sin ocultar funcionalidades a productores.
- Las API originales son wrappers de handlers autenticados. El contrato nuevo
  exige operaciones versionadas; no es compatible con clientes externos antiguos
  que escriban directamente sin sesión. Dentro de esta aplicación se eliminaron
  los envíos antiguos independientes.
- Se retienen claves locales históricas, IDs, filas, columnas y relaciones.

## Errores locales corregidos

| Hallazgo | Corrección | Evidencia |
|---|---|---|
| El listado esperaba una respuesta de red para mostrar locales | Render inmediato; la respuesta no cierra una ficha abierta | Prueba de red pendiente sin resolver |
| Edición offline podía vaciar identificación o duplicarla tras retirar validación remota previa | Validación local compartida antes de escribir; conserva estado anterior al fallar | Prueba de duplicado/vacío y pesaje ajeno |
| Lotes confiaban en aptitud del momento de lectura | Revalidación al consultar/exportar, sin reescribir lectura ni IDs | Tratamiento agregado después de cargar lote |
| TXT podía exportar un animal tratado después de incorporarlo a la lista | Revalidación y conteo de aptos al generar/descargar; mantiene lista e historial previo | Prueba con dos animales y nueva carencia |
| Reproducción asumía RFID siempre presente | Normalización tolerante a campos históricos ausentes | Registro sin RFID |
| Módulos originales locales no respetaban el lock de edición | Sanidad, reproducción, lotes y TXT respetan el mismo bloqueo entre pestañas | Escritura rechazada sin modificar almacenamiento |
| Campos libres de sanidad/reproducción/TXT se interpolaban como HTML | Escape de texto y literales seguros en botones de esos módulos | Entrada con etiqueta ejecutable se renderiza como texto |
| El service worker podía reemplazar una página válida por una respuesta HTTP de error | Conserva copia válida frente a errores; versión v60 | Respuesta de error seguida de lectura cacheada |

Las correcciones sanitarias solucionan defectos previos, no solo regresiones del
diff. Se mantiene la regla temporal original: una liberación igual a la fecha
actual se considera liberada. No se cambió ese criterio sanitario por inferencia.

## Evidencia automatizada

Resultado final: **41 pruebas aprobadas, 0 fallidas**, ejecutando `npm test`.
También pasaron las comprobaciones de sintaxis y `git diff --check`.
La suite incluye:

- Registro y login de dos productores, cookie firmada, expiración, logout,
  intento de logout desde cuenta distinta, usuario inactivo y límite de intentos.
- Aislamiento de ocho tablas mediante ámbito autenticado y de todos los módulos
  locales mediante claves por usuario/establecimiento. Rechazo de IDs, query,
  encabezados y referencias ajenas. Cambio de cookie a mitad de sincronización.
- Registro/búsqueda/edición y pesajes de las pantallas originales en DOM simulado.
  Varias ediciones pendientes, recarga, ACK perdido, descarga antigua, conflicto,
  baja lógica y reautenticación sin perder datos ni cambiar IDs.
- Sanidad, cálculo de fecha y consistencia de carencias en embarque, TXT y lotes;
  reproducción y avisos; lotes/duplicados/cierre; generación e historial TXT;
  parser, clasificación e ingreso de animales desde TXT.
- Migraciones sobre esquema original con usuarios y eventos sintéticos previos:
  conservación de valores originales, emails, hashes, roles históricos e IDs;
  claves foráneas, integridad, rollback y checksums.
- Login histórico scrypt con mayúsculas/espacios en email sin reescribir la fila.
  Email ambiguo o hash no admitido se rechaza sin modificar datos.
- Precaché de archivos que existen, navegación offline simulada, protección de
  cachés ajenas y exclusión de API. No equivale a instalar o abrir la PWA real.

La prueba con @libsql/client usa un archivo temporal exclusivamente sintético,
se ejecuta aislada y elimina el archivo al terminar. No usa el respaldo original.

## HTTP local comprobado

Se inició `scripts/servidor-qa.mjs`, que siempre inyecta SQLite en memoria y no
carga `.env.local`. Resultados observados desde un cliente HTTP Node:

| Acción | Estado |
|---|---|
| Página del laboratorio | 200 |
| Registro sintético | 201 |
| Login sintético | 200 |
| Consulta de sesión con cookie | 200 |
| Establecimiento ajeno | 403 |
| Intento de servir `.env.local` | 404 |

El encabezado Set-Cookie contiene Secure; Node lo reenvió explícitamente. **Esto
no verifica que un navegador acepte o proteja esa cookie.** Se detuvo el servidor
al terminar; no queda un servidor de QA ejecutándose.

## Cuentas y datos históricos: conservación no significa adopción automática

Las migraciones 001–006 no cambian emails, hashes, roles o establecimientos de
usuarios existentes. `email_normalizado` queda NULL en esas filas. No hay DROP,
DELETE ni UPDATE masivo de cuentas productivas.

El login consulta también `LOWER(TRIM(email))` de cuentas anteriores. Si hay una
sola cuenta activa y hash scrypt compatible, el login funciona sin cambiar su ID
o establecimiento. Se probó con datos sintéticos.

**No se conoce el formato real de las contraseñas históricas ni si existen
emails ambiguos en la base remota.** No se consultaron registros productivos.
Por ello no se puede afirmar que todas las cuentas históricas puedan entrar ya.
Hashes de otros algoritmos y emails duplicados normalizados fallan cerrado.
No se deben desplegar estas decisiones suponiendo que un hash antiguo es scrypt.

Los usuarios locales originales usaban un nombre de usuario y contraseña local,
no necesariamente un email o ID coincidente con Turso. Se preservan sus claves;
esas credenciales locales no se convierten en una sesión de servidor.

Procedimiento de asociación seguro, todavía no ejecutado:

1. El dueño conserva una exportación local de las claves productivas originales
   y una copia verificable del respaldo. No compartir contraseñas locales,
   cookies ni tokens como parte del inventario de datos.
2. Con autorización separada, auditar en remoto únicamente los metadatos
   necesarios: unicidad de email normalizado, formatos de hash y relaciones de
   usuarios/establecimientos. Informar categorías y conflictos, sin publicar
   contraseñas ni hashes.
3. Comprobar la propiedad de la cuenta y del espacio local. No deducirla de un
   nombre de usuario, nombre de campo o coincidencia de caravana.
4. Aprobar un mapeo explícito espacio histórico → usuario y establecimiento
   autenticados. Mostrar cantidades, IDs y eventos relacionados en un dry-run.
5. Conciliar IDs repetidos, referencias huérfanas o emails ambiguos con revisión
   humana. No regenerar IDs ni adjudicar el mismo dato a distintos productores.
6. Preparar una importación específica para el mapeo aprobado, preservando la
   exportación original. No existe aún un importador de históricos activado en
   login. Si hace falta recuperación de contraseña, definir verificación de
   propiedad antes de resetear; no reescribir hashes adivinando su formato.
7. Recién entonces autorizar la sincronización de esos datos. Ninguno de estos
   pasos autoriza escrituras remotas implícitamente.

## Sin verificar / bloqueos antes de producción

- Recorrido real en Chrome/móvil y HTTPS real, aceptación de cookies, Web Locks,
  FileReader, descarga de archivos y reinicio de la PWA.
- Instalación PWA: el manifest original tiene `icons: []`. No se puede certificar
  instalación sin completar los íconos y probarla. Bootstrap e iconos externos
  siguen dependiendo de CDN/caché HTTP del navegador; el SW no los precachea.
- Correspondencia del esquema remoto actual con el respaldo, datos históricos,
  formatos de hash y recuperación/adopción de sus cuentas y datos.
- Persistencia remota de sanidad/reproducción/lotes/TXT: sigue pendiente. En este
  bloque se verificó su lógica local y aislamiento, no una integración inexistente.
- Validación oficial del TXT contra SNIG y lector RFID físico. Las pruebas son
  del formato implementado y de datos sintéticos, sin envío externo.

## Decisión

**No está listo para activar escrituras o migrar producción.** El código local
permite preparar la siguiente verificación controlada, pero faltan el recorrido
de navegador y la decisión sobre cuentas/datos históricos. El siguiente paso
remoto admisible sería una auditoría de lectura previamente autorizada; no se
ejecutará sin permiso. No se considera este informe una autorización para Turso,
Vercel, migraciones, despliegue o una base nueva.
