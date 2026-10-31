CREATE INDEX idx_sanidad_animal ON sanidad(animal_id);
CREATE INDEX idx_reproduccion_animal ON reproduccion(animal_id);
CREATE INDEX idx_animales_lotes_animal ON animales_lotes_embarque(animal_id);
CREATE INDEX idx_txt_lista_establecimiento ON txt_lista(establecimiento_id);
CREATE INDEX idx_txt_lista_animal ON txt_lista(animal_id);
CREATE INDEX idx_txt_archivos_establecimiento ON txt_archivos(establecimiento_id);
