# Migraciones RuralData 1.0

Preparación local. No se ejecutaron contra Turso. Requieren Node 24 para las
pruebas con `node:sqlite`; la aplicación conserva su tecnología original.

Orden: `001_campos_funcionales.sql`, `002_sincronizacion.sql`, `003_txt.sql`,
`004_indices.sql`, `005_autenticacion_idempotencia.sql`,
`006_productores_independientes.sql`. Las ocho tablas
existentes se conservan. Se crean `txt_lista`, `txt_archivos`, `auth_intentos`
y el registro técnico `ruraldata_migraciones`.

La quinta migración agrega un contador durable de intentos de autenticación
y `ultima_operacion_id` en animales y pesajes. Permite reintentar una
operación después de perder su respuesta sin incrementar dos veces la versión.
Está preparada y probada solo localmente; requiere aprobación remota igual
que las anteriores.

La sexta agrega `usuarios.email_normalizado` y un índice único para las cuentas
nuevas. No normaliza ni modifica los emails existentes: quedan NULL en la columna
nueva y el login los busca por email original normalizado en consulta. Si existen
dos cuentas históricas con el mismo email normalizado, el login falla cerrado;
deben revisarse con autorización antes de cualquier conciliación. `rol` permanece
intacto; nuevas cuentas escriben solo el literal `productor` para cumplir el
NOT NULL original, sin decisiones de permisos basadas en ese campo.

`scripts/migraciones-locales.mjs` recibe una conexión local y aplica cada archivo
en una transacción, con checksum y registro de aplicación. Reejecutarlo omite
migraciones ya aplicadas; editar una aplicada produce error. Un fallo revierte
el archivo actual, no los archivos anteriores. No hay borrado automático ni
migraciones inversas destructivas. No ejecutar los SQL sueltos dos veces.

Los archivos no usan `IF NOT EXISTS` para esconder diferencias inesperadas:
una estructura incompatible debe detener la migración y revisarse.

## Pruebas

Ejecutar `npm test`. Cada prueba crea SQLite `:memory:` y carga solo el esquema
versionado en `tests/fixtures/esquema-original.sql`, seguido de datos sintéticos.
No abre el respaldo descargado, no carga `.env.local` y no usa red.

La fixture contiene exclusivamente DDL obtenido del respaldo original. No
incluye registros, credenciales ni un archivo de base de datos productiva.

## Antes de una migración remota

1. Obtener autorización expresa y confirmar el esquema vigente en Turso.
2. Obtener y comprobar un respaldo consistente, además de exportar localStorage
   de los dispositivos usados. No asumir que esta fixture respalda sus datos.
3. Autorizar una auditoría separada de IDs nulos, duplicados y huérfanos.
4. Revisar SQL final y coordinar una ventana sin escrituras concurrentes.
5. Preparar un ejecutor específico para Turso con registro de versiones y las
   garantías transaccionales del cliente remoto. El ejecutor local no sirve
   directamente como ejecutor remoto.
6. Aplicar solo tras autorización. Verificar esquema, relaciones y aplicación.

No se agregan índices únicos de caravana/RFID hasta revisar duplicados. No se
cambian IDs ni se eliminan tablas o columnas. Las relaciones se conservan con
`NO ACTION`; los eventos sin animal conocido usan NULL, nunca cadena vacía.

Las versiones deben incrementarse en servidor con actualización condicional.
`eliminado_en` representa una baja sincronizable: la API no hará DELETE físico.
El estado de carencia y aptitud se recalcula; no se confía en una copia antigua.
