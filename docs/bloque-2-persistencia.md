# Bloque 2: preparación local de RuralData 1.0

Documento histórico del bloque 2. La implementación y el estado posterior se
describen en `bloque-3-autenticacion-persistencia.md`; varias limitaciones de
esta preparación ya fueron resueltas en ese bloque.

## Alcance

Un productor, un establecimiento, HTML/CSS/Bootstrap/JavaScript, Vercel y Turso.
Sin roles ni gestión multiusuario. Ninguna página cambia su diseño ni carga aún
el módulo experimental de persistencia. Las API existentes siguen sin cambios:
este bloque no corrige su falta de autenticación ni habilita endpoints nuevos.

## Autenticación mínima propuesta, pendiente de implementar

Una cuenta configurada en Vercel, sin consultar `usuarios.rol` y sin registro
público. Variables de servidor propuestas: `RURALDATA_PRODUCTOR_ID`,
`RURALDATA_ESTABLECIMIENTO_ID`, `RURALDATA_PASSWORD_HASH`,
`RURALDATA_SESSION_SECRET` y `RURALDATA_ALLOWED_ORIGIN`. No generar ni publicar
valores en este bloque. Mantener TURSO_AUTH_TOKEN exclusivamente en servidor.

Implementar `POST /api/login`: comparación segura del hash scrypt con sal y
parámetros incluidos, limitación persistente de intentos (no un Map de una
función efímera) y respuestas genéricas. Emitir sesión firmada HMAC-SHA256 con
identidad, versión de formato y expiración de 12 horas. Cookie `HttpOnly`,
`Secure`, `SameSite=Strict`, `Path=/`; no guardar contraseña ni sesión firmada
en localStorage. Cierre de sesión borra cookie. Rotar secreto invalida sesiones.

Middleware común verifica firma en tiempo constante, vencimiento, identidad
configurada y origen exacto en escrituras. Sin configuración válida, falla
cerrado. Aplicarlo a animales, pesajes, futuros eventos, login/logout según su
contrato y al diagnóstico (o retirar test-db del despliegue). El servidor toma
el establecimiento de configuración, no del body/query. Verificar que todo
animal/lote relacionado pertenece a ese establecimiento; FK por ID no basta.

Un timeout, 401 o 403 conserva la cola local. Pedir login antes de reanudar la
sincronización. Acceso offline mantiene datos ya disponibles en ese navegador;
no ofrece confidencialidad frente a alguien con acceso al perfil del equipo.

Antes de nuevas escrituras remotas: probar solicitudes sin cookie, firma
alterada, expiración, origen inválido y sesión válida. Integrar login y proteger
TODAS las rutas existentes en el mismo cambio, sin depender del rol visual.

## Persistencia común propuesta

`js/persistencia-mvp.js` es un núcleo ES module aislado y probado; no utiliza red.
Guarda registros, pendientes y conflictos en un único sobre localStorage por
establecimiento para evitar escrituras separadas de registro y cola.

El núcleo conserva IDs, admite ACK repetido, retiene una descarga competidora
como conflicto y no reemplaza datos con versiones anteriores. Errores de cuota
o JSON corrupto se propagan: la interfaz deberá avisar y ofrecer exportación,
sin afirmar que guardó. En esta preparación se rechaza otra edición del mismo
registro pendiente: falta implementar edición sucesiva de cola y su interfaz.
No está resuelta la concurrencia entre pestañas; bloquear un segundo escritor
mediante Web Locks antes de conectarlo a formularios.

No importa automáticamente claves antiguas. Primero exportar todas las claves
originales, identificar el único establecimiento y mostrar cualquier conflicto.
Importación debe conservar IDs y marcar registros locales como pendientes,
sin asignar versiones remotas ficticias. Mismo RFID/caravana con distinto ID
requiere conciliación explícita con todos sus eventos; nunca sustituir el ID.

## Contrato de sincronización a implementar

1. GET devuelve también bajas lógicas y versiones; no pasa por caché del SW.
2. Cola: establecimientos existentes/identidad, animales, lotes, eventos,
   integrantes y TXT. Establecimiento no se crea desde la cola.
3. Alta usa ID actual. Reintento con mismo ID y payload devuelve el mismo
   resultado; colisión con contenido diferente devuelve 409, no éxito aparente.
4. Edición/baja envía `versionBase`; servidor usa `WHERE id=? AND version=?`
   y establecimiento autorizado, incrementa versión y comprueba filas afectadas.
5. Ante ACK perdido, comprobar el estado remoto; si coincide con el resultado
   esperado, confirmar. Si no coincide, conservar conflicto sin reintento ciego.
6. 409 conserva ambas versiones. La decisión del productor genera una operación
   explícita basada en la versión nueva; ninguna fecha decide por sí sola.
7. ACK confirma el mismo ID y una versión nueva. Errores/timeout no retiran cola.
8. Reintentar al abrir app, evento online y acción manual, con espera creciente
   y un único sincronizador. `navigator.onLine` no demuestra conexión a la API.

La prueba SQL de compare-and-swap valida la idea sobre SQLite sintético; no
equivale a una API de sincronización implementada ni a idempotencia remota.

## Adaptación mínima de módulos originales

| Archivo | Cambio posterior |
|---|---|
| storage.js | Fachada común y adopción explícita de claves existentes; conservar getters para pantallas |
| animales.js | Alta local y operación pendiente; retirar intento remoto independiente |
| listados.js | Unificar descarga, edición y pesajes; corregir alta que envía null; no mezclar IDs |
| identificacion.js | Usar la misma persistencia de ficha y pesajes que listados |
| sanidad.js | Adaptar campos snake_case, booleans 0/1 y fechas; sanidad primero para carencias |
| reproduccion.js | Mapear fechaEstimadaParto a fecha_probable_parto sin nueva columna duplicada |
| lotes-embarque.js | Persistir lote/integrantes; IDs desconocidos como NULL; revalidar aptitud al exportar |
| txt-snig.js | Persistir lista e historial generado; revalidar sanidad antes de descargar |
| importar-txt.js | Encolar animales importados e historial; conservar firma y metadatos actuales |
| embarque.js, resumen.js, app.js | Consultar misma caché; mostrar pendientes y advertir si sanidad no está actualizada |
| auth.js | Sustituir login local por cuenta única, retirar dependencia funcional de roles sin rediseñar |
| service-worker.js | Excluir /api/; corregir caché de navegación y precache necesario para offline |

## Estructura final propuesta

Se conservan las ocho tablas originales. Se agregan `txt_lista`, `txt_archivos`
y `ruraldata_migraciones` (técnica, creada por el ejecutor). Seis tablas
productivas originales y ambas TXT tienen versión y eliminación lógica.
No se requiere ampliar `usuarios` o `establecimientos` ni usar sus roles.

## Pendientes de validación real

Integración navegador sin conexión, reinicio, dos pestañas, login vencido,
ACK perdido, reconexión y segundo navegador. Pruebas HTTP de autorización,
validación de payloads, duplicados y pertenencia. Revalidación de carencias
después de armar lote/TXT. Ninguna prueba local autoriza escrituras remotas.

Crear/configurar secretos en Vercel, auditar registros productivos, respaldar
remotamente, migrar Turso y desplegar la integración requieren autorización
remota expresa. No se hicieron en este bloque.
