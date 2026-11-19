CREATE TABLE sanidad_operaciones (
  establecimiento_id TEXT NOT NULL REFERENCES establecimientos(id),
  operacion_id TEXT NOT NULL,
  solicitud_hash TEXT NOT NULL,
  respuesta_json TEXT NOT NULL,
  PRIMARY KEY (establecimiento_id, operacion_id)
);
