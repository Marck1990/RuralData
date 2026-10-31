-- Preparada localmente; no aplicada a Turso.
CREATE TABLE auth_intentos (
  clave TEXT NOT NULL PRIMARY KEY,
  ventana INTEGER NOT NULL,
  cantidad INTEGER NOT NULL
);
ALTER TABLE animales ADD COLUMN ultima_operacion_id TEXT;
ALTER TABLE pesajes ADD COLUMN ultima_operacion_id TEXT;
