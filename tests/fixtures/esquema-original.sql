-- Solo DDL del respaldo; sin registros productivos.
CREATE TABLE animales (
  id TEXT PRIMARY KEY,
  establecimiento_id TEXT NOT NULL,
  caravana_visual TEXT,
  codigo_rfid TEXT,
  categoria TEXT,
  sexo TEXT,
  raza TEXT,
  fecha_nacimiento TEXT,
  propietario TEXT,
  campo TEXT,
  observaciones TEXT,
  origen TEXT,
  fecha_registro TEXT NOT NULL,
  fecha_actualizacion TEXT,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id)
);

CREATE TABLE animales_lotes_embarque (
  id TEXT PRIMARY KEY,
  establecimiento_id TEXT NOT NULL,
  lote_id TEXT NOT NULL,
  animal_id TEXT,
  caravana_visual TEXT,
  codigo_rfid TEXT,
  estado TEXT NOT NULL,
  motivo_bloqueo TEXT,
  camion TEXT,
  orden_carga INTEGER,
  fecha_lectura TEXT NOT NULL,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id),
  FOREIGN KEY (lote_id) REFERENCES lotes_embarque(id),
  FOREIGN KEY (animal_id) REFERENCES animales(id)
);

CREATE TABLE establecimientos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  departamento TEXT,
  localidad TEXT,
  fecha_registro TEXT NOT NULL
);

CREATE TABLE lotes_embarque (
  id TEXT PRIMARY KEY,
  establecimiento_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  fecha TEXT NOT NULL,
  destino TEXT,
  transportista TEXT,
  matricula_camion TEXT,
  numero_guia TEXT,
  estado TEXT NOT NULL DEFAULT 'abierto',
  fecha_registro TEXT NOT NULL,
  fecha_actualizacion TEXT,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id)
);

CREATE TABLE pesajes (
  id TEXT PRIMARY KEY,
  establecimiento_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  peso_kg REAL NOT NULL,
  observaciones TEXT,
  origen TEXT,
  fecha_registro TEXT NOT NULL,
  fecha_actualizacion TEXT,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id),
  FOREIGN KEY (animal_id) REFERENCES animales(id)
);

CREATE TABLE reproduccion (
  id TEXT PRIMARY KEY,
  establecimiento_id TEXT NOT NULL,
  animal_id TEXT,
  caravana_visual TEXT,
  estado_reproductivo TEXT,
  fecha_servicio TEXT,
  fecha_probable_parto TEXT,
  observaciones TEXT,
  fecha_registro TEXT NOT NULL,
  fecha_actualizacion TEXT,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id),
  FOREIGN KEY (animal_id) REFERENCES animales(id)
);

CREATE TABLE sanidad (
  id TEXT PRIMARY KEY,
  establecimiento_id TEXT NOT NULL,
  animal_id TEXT,
  caravana_visual TEXT,
  codigo_rfid TEXT,
  tipo_control TEXT,
  producto TEXT,
  fecha_aplicacion TEXT,
  tiene_carencia INTEGER NOT NULL DEFAULT 0,
  dias_carencia INTEGER NOT NULL DEFAULT 0,
  fecha_liberacion TEXT,
  observaciones TEXT,
  fecha_registro TEXT NOT NULL,
  fecha_actualizacion TEXT,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id),
  FOREIGN KEY (animal_id) REFERENCES animales(id)
);

CREATE TABLE usuarios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL,
  establecimiento_id TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1,
  fecha_registro TEXT NOT NULL,
  FOREIGN KEY (establecimiento_id) REFERENCES establecimientos(id)
);

CREATE INDEX idx_animales_caravana
ON animales (caravana_visual);

CREATE INDEX idx_animales_establecimiento
ON animales (establecimiento_id);

CREATE INDEX idx_animales_lote
ON animales_lotes_embarque (lote_id);

CREATE INDEX idx_animales_rfid
ON animales (codigo_rfid);

CREATE INDEX idx_lotes_establecimiento
ON lotes_embarque (establecimiento_id);

CREATE INDEX idx_pesajes_animal
ON pesajes (animal_id);

CREATE INDEX idx_sanidad_establecimiento
ON sanidad (establecimiento_id);
