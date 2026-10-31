ALTER TABLE animales ADD COLUMN estado TEXT;
ALTER TABLE animales ADD COLUMN metodo_ingreso TEXT;
ALTER TABLE animales ADD COLUMN numero_guia_importacion TEXT;
ALTER TABLE animales ADD COLUMN fecha_lectura_txt TEXT;
ALTER TABLE animales ADD COLUMN hora_lectura_txt TEXT;

ALTER TABLE sanidad ADD COLUMN identificacion TEXT;
ALTER TABLE sanidad ADD COLUMN categoria_animal TEXT;
ALTER TABLE sanidad ADD COLUMN propietario_animal TEXT;
ALTER TABLE sanidad ADD COLUMN campo_animal TEXT;
ALTER TABLE sanidad ADD COLUMN numero_habilitacion TEXT;
ALTER TABLE sanidad ADD COLUMN fecha_proxima TEXT;
ALTER TABLE sanidad ADD COLUMN dosis TEXT;
ALTER TABLE sanidad ADD COLUMN via_administracion TEXT;
ALTER TABLE sanidad ADD COLUMN veterinario_firmante TEXT;

ALTER TABLE reproduccion ADD COLUMN codigo_rfid TEXT;
ALTER TABLE reproduccion ADD COLUMN categoria TEXT;
ALTER TABLE reproduccion ADD COLUMN dias_aviso INTEGER;
ALTER TABLE animales_lotes_embarque ADD COLUMN fecha_actualizacion TEXT;
