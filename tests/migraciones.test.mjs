import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { aplicarMigraciones } from '../scripts/migraciones-locales.mjs';

function preparar(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(readFileSync(new URL('./fixtures/esquema-original.sql', import.meta.url), 'utf8'));
  db.exec(`
    INSERT INTO establecimientos(id,nombre,fecha_registro) VALUES ('campo-test','Campo sintético','2026-01-01');
    INSERT INTO usuarios(id,nombre,email,password_hash,rol,establecimiento_id,fecha_registro)
      VALUES ('usuario-historico','Histórico','  Historico@QA.LOCAL  ','hash-historico-sintetico','valor-historico','campo-test','2026-01-01');
    INSERT INTO animales(id,establecimiento_id,caravana_visual,fecha_registro)
      VALUES ('animal-test','campo-test','TEST-001','2026-01-01');
    INSERT INTO pesajes(id,establecimiento_id,animal_id,fecha,peso_kg,fecha_registro)
      VALUES ('peso-test','campo-test','animal-test','2026-01-02',350,'2026-01-02');
    INSERT INTO sanidad(id,establecimiento_id,animal_id,fecha_registro)
      VALUES ('sanidad-test','campo-test','animal-test','2026-01-02');
    INSERT INTO reproduccion(id,establecimiento_id,animal_id,fecha_registro)
      VALUES ('repro-test','campo-test','animal-test','2026-01-02');
    INSERT INTO lotes_embarque(id,establecimiento_id,nombre,fecha,fecha_registro)
      VALUES ('lote-test','campo-test','Lote sintético','2026-01-03','2026-01-03');
    INSERT INTO animales_lotes_embarque(id,establecimiento_id,lote_id,animal_id,estado,fecha_lectura)
      VALUES ('integrante-test','campo-test','lote-test','animal-test','apto','2026-01-03');
  `);
  return db;
}

test('migraciones conservan todos los campos, IDs y relaciones originales', t => {
  const db = preparar(t);
  const tablas = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  const originales = Object.fromEntries(tablas.map(n => [n, db.prepare(`SELECT * FROM ${n}`).all()]));
  assert.equal(aplicarMigraciones(db).length, 6);
  for (const n of tablas) {
    const actuales = db.prepare(`SELECT * FROM ${n}`).all();
    assert.equal(actuales.length, originales[n].length);
    for (let i = 0; i < actuales.length; i++) {
      for (const [campo, valor] of Object.entries(originales[n][i])) assert.equal(actuales[i][campo], valor);
    }
  }
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
  assert.deepEqual(aplicarMigraciones(db), []);
  const esperado = ['animales','pesajes','sanidad','reproduccion','lotes_embarque','animales_lotes_embarque','txt_lista','txt_archivos'];
  for (const tabla of esperado) {
    const columnas = db.prepare(`PRAGMA table_info(${tabla})`).all().map(c => c.name);
    for (const campo of ['version','eliminado_en','fecha_actualizacion']) assert.ok(columnas.includes(campo), `${tabla}.${campo}`);
  }
});

test('relaciones rechazan huérfanos y admiten integrantes sin animal registrado', t => {
  const db = preparar(t); aplicarMigraciones(db);
  assert.throws(() => db.prepare('UPDATE pesajes SET animal_id=?').run('inexistente'), /FOREIGN KEY/);
  assert.throws(() => db.prepare('DELETE FROM animales WHERE id=?').run('animal-test'), /FOREIGN KEY/);
  db.exec(`INSERT INTO animales_lotes_embarque(id,establecimiento_id,lote_id,animal_id,estado,fecha_lectura)
    VALUES ('sin-animal','campo-test','lote-test',NULL,'no_apto','2026-01-03')`);
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

test('TXT conserva contenido e IDs y valida referencias y tipo', t => {
  const db = preparar(t); aplicarMigraciones(db);
  db.exec(`INSERT INTO txt_lista(id,establecimiento_id,animal_id,fecha_actualizacion)
    VALUES ('lista-test','campo-test','animal-test','2026-01-03')`);
  db.prepare(`INSERT INTO txt_archivos(id,establecimiento_id,tipo,nombre_archivo,contenido,fecha_actualizacion)
    VALUES ('txt-test','campo-test','generado','sintetico.txt',?,'2026-01-03')`).run('[|TEST-001|]');
  assert.equal(db.prepare('SELECT contenido FROM txt_archivos').get().contenido, '[|TEST-001|]');
  assert.throws(() => db.exec("UPDATE txt_archivos SET tipo='otro'"), /CHECK/);
  assert.throws(() => db.exec("UPDATE txt_lista SET animal_id='inexistente'"), /FOREIGN KEY/);
});

test('duplicados: PK se rechaza; caravana existente se detecta sin borrar ni imponer unicidad', t => {
  const db = preparar(t); aplicarMigraciones(db);
  assert.throws(() => db.exec(`INSERT INTO animales(id,establecimiento_id,fecha_registro)
    VALUES ('animal-test','campo-test','2026-01-01')`), /UNIQUE/);
  db.exec(`INSERT INTO animales(id,establecimiento_id,caravana_visual,fecha_registro)
    VALUES ('otro-id','campo-test',' test-001 ','2026-01-01')`);
  const repetidas = db.prepare(`SELECT establecimiento_id,LOWER(TRIM(caravana_visual)),COUNT(*) AS cantidad
    FROM animales WHERE TRIM(COALESCE(caravana_visual,'')) <> ''
    GROUP BY establecimiento_id,LOWER(TRIM(caravana_visual)) HAVING COUNT(*) > 1`).all();
  assert.equal(repetidas.length, 1);
  assert.equal(repetidas[0].cantidad, 2);
});

test('edición condicional detecta conflicto; eliminación lógica conserva eventos', t => {
  const db = preparar(t); aplicarMigraciones(db);
  const editar = db.prepare('UPDATE animales SET observaciones=?,version=version+1 WHERE id=? AND version=?');
  assert.equal(editar.run('primera edición','animal-test',1).changes, 1);
  assert.equal(editar.run('edición antigua','animal-test',1).changes, 0);
  db.exec("UPDATE animales SET eliminado_en='2026-01-04',version=version+1 WHERE id='animal-test'");
  assert.equal(db.prepare('SELECT animal_id FROM pesajes').get().animal_id, 'animal-test');
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});

test('detecta cambios en una migración aplicada', t => {
  const db = preparar(t); aplicarMigraciones(db);
  db.exec("UPDATE ruraldata_migraciones SET checksum='alterado' WHERE nombre='001_campos_funcionales.sql'");
  assert.throws(() => aplicarMigraciones(db), /Migración alterada/);
});

test('una migración fallida revierte sus ALTER sin perder el registro previo', t => {
  const db = preparar(t);
  db.exec('ALTER TABLE sanidad ADD COLUMN dosis TEXT');
  assert.throws(() => aplicarMigraciones(db), /duplicate column/);
  assert.equal(db.prepare("PRAGMA table_info(animales)").all().some(c => c.name === 'metodo_ingreso'), false);
  assert.equal(db.prepare('SELECT id FROM animales').get().id, 'animal-test');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM ruraldata_migraciones').get().n, 0);
});
