import test from 'node:test';
import { mkdtempSync,rmSync,rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const ejecutar=promisify(execFile);

test('los handlers funcionan con @libsql/client real sobre archivo temporal sintético',async()=>{
  const carpeta=mkdtempSync(join(tmpdir(),'ruraldata-sintetica-'));
  const archivo=join(carpeta,'prueba.db');
  try {
    // libSQL conserva handles nativos hasta finalizar el proceso en Windows.
    await ejecutar(process.execPath,[fileURLToPath(new URL('./support/libsql-local.mjs',import.meta.url)),archivo],{timeout:30000});
  } finally {
    for(const sufijo of ['', '-wal','-shm','-journal'])rmSync(archivo+sufijo,{force:true});
    rmdirSync(carpeta);
  }
});
