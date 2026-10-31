# Bloque 3 — RuralData 1.0

**Documento histórico de la implementación de cuenta única. Ese alcance quedó
reemplazado por `ajuste-productores-bloque-3.md`: múltiples cuentas independientes,
sin roles. No usar las instrucciones de cuenta fija de este documento para
configurar o desplegar la aplicación.**

## Estado

Implementación local en `mvp/ruraldata-1-persistencia`. Sin cambios en Turso,
Vercel ni el respaldo descargado; sin despliegue. Las API no abren conexiones
al importarlas. `RURALDATA_REMOTE_ENABLED` tiene que ser exactamente `true`
para que el proveedor real abra Turso; por defecto falla cerrado. Las pruebas
inyectan exclusivamente proveedores SQLite sintéticos y no cargan `.env.local`.

## Autenticación

`api/sesion.js` usa `server/sesion-handler.js` y `server/auth.js`.

- POST verifica una cuenta única mediante scrypt con sal aleatoria de 16 bytes,
  N=16384, r=8, p=1 y clave derivada de 64 bytes. `hashPassword` es una utilidad
  exclusivamente de servidor; no exponerla como API ni importar desde HTML.
- `auth_intentos` limita globalmente esa cuenta a diez intentos por ventana
  de quince minutos. Es durable entre instancias de Vercel; también puede
  bloquear temporalmente al productor si terceros agotan los intentos.
- La sesión firmada con HMAC-SHA256 vence en doce horas. Cookie
  `__Host-ruraldata`, `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, sin Domain.
  Se requiere HTTPS también en un servidor de desarrollo con navegador.
- GET valida sesión y devuelve solo perfil público. DELETE valida sesión y
  origen y elimina la cookie. El token firmado no tiene revocación individual:
  un token copiado sigue válido hasta vencer o rotar el secreto del servidor.
- Toda escritura exige Origin exacto; escrituras de datos exigen JSON.
- Las cuatro API (`sesion`, `animales`, `pesajes`, `test-db`) usan `no-store`.
  Los endpoints de datos y diagnóstico comprueban sesión antes de abrir la DB.
- El establecimiento proviene solo de configuración del servidor. Se rechazan
  parámetros ajenos y se comprueba pertenencia del animal de cada pesaje.
- No se utiliza `usuarios.rol`, no existe registro público ni gestión de cuentas.

Configuración pendiente de autorización en Vercel: las variables documentadas
en `.env.example`, un hash real de la contraseña, un secreto aleatorio de al
menos 32 caracteres y el origen HTTPS exacto. No hay valores reales en el repo.
No activar la conexión antes de aplicar las migraciones autorizadas.

La implementación utiliza las primitivas de [Node crypto](https://nodejs.org/api/crypto.html)
y los atributos de [Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie).

## Datos locales y conservación de identidad

`storage.js` conserva los getters/setters originales. Animales y pesajes se
derivan al núcleo `persistencia-mvp.js` mediante `integracion-mvp.js`, cargado
como módulo por todas las pantallas. Sanidad/reproducción/lotes/TXT mantienen
su almacenamiento original en este bloque; sus pantallas siguen disponibles.

Al iniciar sesión se conserva el espacio local anterior tras confirmación; si
hay varios, el productor elige explícitamente uno. No se fusionan espacios ni
se cambian las claves de sanidad o eventos. La elección determina solo la
caché local: no autoriza al navegador a elegir el establecimiento remoto.
La adopción mantiene las claves originales sin modificarlas. Registros
anteriores se encolan sin versión remota supuesta; diferencias con Turso se
tratan como conflictos, no se sobrescriben silenciosamente.

Un sobre JSON por espacio guarda registros y cola en una sola escritura.
Cada edición conserva una instantánea y un ID de operación. Las ediciones
sucesivas dependen de la anterior y se rebasa su versión solo al confirmarla.
Un ACK no reemplaza una edición local posterior. Las descargas hacen mezcla
por ID y versión, nunca por RFID/caravana ni reemplazando toda la colección.
Las bajas son lógicas y se siguen descargando para evitar resurrecciones.

Las API usan transacción y versión esperada para guardar. Un 409 conserva
ambas copias y requiere decisión explícita en el panel de sincronización.
Aceptar remoto archiva las operaciones locales en el sobre; conservar local
mantiene todas las revisiones en cola con la versión remota revisada.
Duplicados con distinto ID nunca se concilian automáticamente. El panel muestra
el problema y exige revisión de identificaciones, sin cambiar el ID.

Una pestaña conserva el Web Lock de edición. Las demás pueden consultar,
pero no escribir ni sincronizar. Navegadores sin Web Locks bloquean edición
en lugar de arriesgar sobrescritura entre pestañas. Al volver desde bfcache se
recarga para adquirir el lock de nuevo.

Cuota agotada o JSON inválido detienen el guardado e informan el error. No hay
recuperación automática ni borrado del almacenamiento corrupto.

El perfil público local permite continuar con datos de este equipo tras vencer
la sesión o sin conexión. No autoriza ninguna API. El antiguo almacenamiento
de usuarios demo queda intacto por conservación, pero no se consulta para login
ni se crean nuevas contraseñas locales. Su saneamiento necesita una decisión
explícita para no borrar datos históricos sin permiso.

## Sincronizador

`sincronizador-mvp.js` recibe el proveedor fetch y la persistencia. Verifica
sesión, envía animales antes de pesajes, respeta dependencias, conserva la cola
ante 401/403/errores/timeout y descarga registros con versiones. Cada request
tiene timeout de quince segundos. Hay un único ciclo activo por pestaña.

Arranca al abrir la app, al evento online, por botón y cada sesenta segundos.
La reconexión después de login reanuda los pendientes del mismo espacio. No se
usa `navigator.onLine` como evidencia de acceso al servidor.

El service worker v58 precachea los módulos nuevos, excluye `/api/` y deja de
sobrescribir el HTML de index al navegar a otra pantalla. Al actualizar elimina
solo cachés anteriores cuyo nombre pertenece a RuralData.

## Pruebas y límites

`npm test`: autenticación, tasa durable, aislamiento, formularios originales
ejecutados en DOM simulado, integridad SQLite, múltiples ediciones offline,
sesión vencida, reautenticación, ACK perdido y conflictos. No se usa navegador
real ni se afirma una prueba visual o de cookies realizada en navegador.

El circuito completo conecta el sincronizador con los handlers reales mediante
transporte local en memoria y SQLite sintético. Otra prueba usa @libsql/client
real sobre un archivo temporal sintético y un proceso aislado para liberar sus
handles nativos en Windows. No se usan datos del respaldo. El archivo temporal
se elimina al terminar el proceso.

Pendiente antes del MVP desplegado: recorrido real en navegador HTTPS y móvil,
comprobación del esquema remoto vigente, auditoría autorizada de duplicados y
huérfanos, respaldo recuperable, migraciones 001–005, configuración de secretos
y despliegue coordinado. Todo cambio remoto requiere autorización expresa.

La tabla original `usuarios` queda intacta. Se agregó únicamente la migración
005 para autenticación/idempotencia, sin ejecutar SQL remoto. La persistencia
remota de sanidad, reproducción, lotes y TXT sigue para el siguiente bloque.
