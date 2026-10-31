CREATE TABLE txt_lista (
  id TEXT NOT NULL PRIMARY KEY,
  establecimiento_id TEXT NOT NULL REFERENCES establecimientos(id),
  animal_id TEXT REFERENCES animales(id),
  caravana_visual TEXT,
  codigo_rfid TEXT,
  caravana_ocho_digitos TEXT,
  categoria TEXT,
  sexo TEXT,
  campo TEXT,
  fecha_lectura TEXT,
  hora_lectura TEXT,
  fecha_actualizacion TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  eliminado_en TEXT
);

CREATE TABLE txt_archivos (
  id TEXT NOT NULL PRIMARY KEY,
  establecimiento_id TEXT NOT NULL REFERENCES establecimientos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('generado', 'importado')),
  nombre_archivo TEXT NOT NULL,
  numero_guia TEXT,
  firma_archivo TEXT,
  cantidad_animales INTEGER,
  cantidad_lineas INTEGER,
  contenido TEXT,
  fecha_generacion TEXT,
  hora_generacion TEXT,
  fecha_procesado TEXT,
  fecha_registro TEXT,
  fecha_actualizacion TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  eliminado_en TEXT
);
