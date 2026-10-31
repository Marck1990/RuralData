# Bloque 3 corregido: productores independientes

## Alcance definitivo

Múltiples cuentas públicas de productores. Cada registro crea una cuenta y un
establecimiento propio; todas las cuentas tienen los mismos permisos sobre sus
datos. Sin empleados, jerarquías, invitaciones ni administración de usuarios de
un mismo establecimiento. Se mantiene HTML/CSS/Bootstrap/JavaScript y Vercel/Turso.

Implementado y probado únicamente de forma local. La bandera
`RURALDATA_REMOTE_ENABLED` sigue deshabilitada por defecto. No se accedió a Turso,
Vercel o al respaldo descargado durante este ajuste. No hubo despliegue.

## Registro y autenticación

- `POST /api/registro`: nombre, email, contraseña y nombre del establecimiento.
  Servidor genera UUID de usuario y establecimiento, deriva contraseña con
  scrypt y crea ambos en una transacción. Nunca acepta IDs, establecimiento ni
  permisos del navegador. Un error revierte ambas altas. No inicia sesión ni
  cambia la cookie de otra pestaña.
- `POST /api/sesion`: email y contraseña. Consulta `usuarios`, verifica hash y
  `activo`. Devuelve solo perfil público; cookie segura firmada de doce horas.
- Sesión v2: firma identifica el usuario y liga la sesión al hash actual. Cada
  petición vuelve a consultar usuario activo y su establecimiento en DB. No se
  confía en un establecimiento incorporado al token ni enviado por el cliente.
  Cambiar el hash o desactivar la cuenta invalida las sesiones anteriores.
- Origen HTTPS exacto, JSON en escrituras y `Cache-Control: no-store`.
- Límites durables: login por email (10/15 minutos) y origen de red (50/15);
  registro por origen de red (5/15) y email (10/15). Se usa dirección del socket,
  no cabeceras X-Forwarded-For controlables por el cliente. Si no está disponible
  o varios clientes comparten proxy, comparten la cuota de origen. Revisar esta
  identificación en Vercel antes de publicar; no relajamos el límite aquí.
- Registro público no incluye todavía verificación por correo, recuperación de
  contraseña ni revocación individual de tokens. Logout elimina cookie; el token
  copiado permanece válido hasta expirar, cambiar contraseña o rotar el secreto.

Se reutiliza `usuarios` sin recrearla ni modificar filas anteriores. Como `rol`
es NOT NULL, las nuevas filas usan el literal `productor` por compatibilidad;
ningún permiso, sesión o interfaz consulta ese campo para autorizar.

## Migración 006 y cuentas existentes

`006_productores_independientes.sql` agrega `email_normalizado` e índices para
unicidad normalizada de cuentas nuevas y búsqueda por establecimiento. Es solo
un script preparado; no se aplicó remotamente. No requiere recrear tablas.

El login admite cuentas anteriores con email_normalizado NULL y hash scrypt en
el formato implementado. Si el email tiene más de una coincidencia normalizada,
o el hash tiene otro formato, rechaza el login sin reescribir nada. La adopción de
otros hashes y la recuperación de cuentas necesitan una revisión autorizada;
no se inventan contraseñas ni se modifican cuentas históricas.

Solo son necesarias las variables de autenticación compartidas
`RURALDATA_SESSION_SECRET` y `RURALDATA_ALLOWED_ORIGIN`. Se retiraron de la plantilla
las variables de productor, establecimiento y contraseña globales. Las variables
Turso y la bandera de activación se mantienen. No se tocaron variables reales.

## Aislamiento remoto

`autorizar` valida firma y vigencia antes de abrir la base; consulta `usuarios`
unida a `establecimientos` y obtiene el ámbito efectivo. Todas las API protegidas
lo usan. Se rechazan ámbitos ajenos enviados por query, body o cabecera.

Animales y pesajes filtran consultas por establecimiento; al editar un ID se
comprueba su pertenencia. Pesajes solo aceptan animales activos del ámbito.
Caravana/RFID pueden repetirse entre productores, nunca causan fusiones de IDs.

`server/datos-establecimiento.js` centraliza la consulta con ámbito para las ocho
tablas productivas: animales, pesajes, sanidad, reproducción, lotes, integrantes,
lista TXT e historial TXT. Los próximos endpoints deben usar ese ámbito y validar
también las referencias de sus escrituras. No se habilitaron nuevos endpoints de
sanidad/reproducción/lotes/TXT: siguen pendientes para el bloque siguiente.

## Aislamiento local y sincronización

El perfil público de la pestaña está en sessionStorage; la credencial de servidor
permanece únicamente en cookie HttpOnly. Todos los módulos locales usan un espacio
calculado de usuario + establecimiento. No se acepta un alias local arbitrario.
Colas, conflictos y bajas quedan en sobres separados en localStorage. Sanidad,
reproducción, lotes y TXT mantienen su lógica original y separan sus claves con
ese mismo espacio. Un Web Lock de edición por espacio evita escritores simultáneos
en la misma cuenta sin bloquear otra cuenta independiente.

Una cookie es compartida por las pestañas del origen: iniciar sesión B puede
cambiarla mientras A sigue abierta. Cada petición del sincronizador declara su
identidad esperada en cabeceras que el servidor contrasta con la sesión real.
Además compara el perfil de GET sesión antes de enviar o descargar y verifica
que la identidad local no cambió durante una solicitud. Un desacuerdo conserva
la cola sin enviar datos a otro establecimiento. Logout usa la misma protección.

La sesión local de la pestaña permite recargar y editar sin conexión aunque haya
vencido la sesión remota. Un marcador persistente del último perfil confirmado
permite reabrir la PWA offline y se copia al contexto de la pestaña: no es un
token ni autoriza APIs. No hay selector anónimo para abrir otras cuentas cacheadas.
Cambiar de cuenta requiere login online. Reautenticar la misma cuenta reanuda su
cola. Cerrar sesión elimina el perfil activo y avisa a las pestañas de esa misma
cuenta, pero no borra datos ni pendientes. Si no queda un perfil activo, se requiere
login online para volver a entrar a la caché correspondiente.

El aislamiento es el de la aplicación. Como en cualquier localStorage, no cifra
datos frente a alguien con acceso al perfil del navegador o a sus herramientas.
Para equipos compartidos, usar perfiles de navegador separados.

## Datos anteriores al ajuste

Las claves antiguas, los sobres de cuenta única y las filas productivas quedan
intactos. Se eliminó su adopción automática y la elección de un espacio ajeno en
login. Para asociarlos a una cuenta real habrá que comprobar propiedad y preparar
una importación explícita que conserve IDs y todas sus relaciones. No se debe
interpretar una caché nueva vacía como eliminación de esos datos históricos.

## Verificación local

`npm test` cubre regresión del bloque 3 y registro/login de dos productores, hash
con sal, ausencia de roles funcionales, duplicados de email sin establecimientos
huérfanos, aislamiento de ocho tablas, aislamiento de todos los módulos locales,
IDs y referencias ajenos, cuenta inactiva, cambio de cookie durante sincronización,
pendientes offline y reautenticación. Incluye cliente libSQL real sobre SQLite
temporal sintético, sin conexión remota. Los formularios se prueban en DOM simulado;
todavía falta recorrido en navegador HTTPS real.

No avanzar a 4A ni habilitar red sin revisión del usuario. Para publicar quedan:
respaldo y auditoría autorizados, esquema remoto vigente, migraciones 001–006,
configuración de secretos, prueba real HTTPS y autorización de despliegue.
