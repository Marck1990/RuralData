import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';

// Recibe una conexión SQLite local abierta por el llamador. No abre archivos,
// no importa credenciales y no dispone de cliente remoto.
export function aplicarMigraciones(db, directorio = new URL('../migrations/', import.meta.url)) {
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`CREATE TABLE IF NOT EXISTS ruraldata_migraciones (
    nombre TEXT NOT NULL PRIMARY KEY,
    checksum TEXT NOT NULL,
    aplicada_en TEXT NOT NULL
  )`);
  const aplicadas = [];
  for (const nombre of readdirSync(directorio).filter(n => /^\d{3}_.+\.sql$/.test(n)).sort()) {
    const sql = readFileSync(new URL(nombre, directorio), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const anterior = db.prepare('SELECT checksum FROM ruraldata_migraciones WHERE nombre = ?').get(nombre);
    if (anterior) {
      if (anterior.checksum !== checksum) throw new Error(`Migración alterada: ${nombre}`);
      continue;
    }
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      if (db.prepare('PRAGMA foreign_key_check').all().length) {
        throw new Error('Relaciones inválidas; migración cancelada');
      }
      db.prepare('INSERT INTO ruraldata_migraciones VALUES (?, ?, ?)')
        .run(nombre, checksum, new Date().toISOString());
      db.exec('COMMIT');
      aplicadas.push(nombre);
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return aplicadas;
}
