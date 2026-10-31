-- No reescribe emails ni roles existentes. Los registros anteriores quedan NULL.
ALTER TABLE usuarios ADD COLUMN email_normalizado TEXT;
CREATE UNIQUE INDEX idx_usuarios_email_normalizado ON usuarios(email_normalizado);
CREATE INDEX idx_usuarios_establecimiento ON usuarios(establecimiento_id);
