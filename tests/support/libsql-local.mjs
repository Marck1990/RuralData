import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { crearRegistrosHandler } from '../../server/registros-handler.js';
import { configuracion,crearSesion,cookieSesion } from '../../server/auth.js';
import { envSintetico as env,productorSintetico,llamar } from '../helpers.mjs';
const archivo=process.argv[2];
  const url=pathToFileURL(archivo).href;
  const inicial=createClient({url});
  try {
    await inicial.executeMultiple(readFileSync(new URL('../fixtures/esquema-original.sql',import.meta.url),'utf8'));
    for(const nombre of readdirSync(new URL('../../migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort()) {
      await inicial.executeMultiple(readFileSync(new URL('../../migrations/'+nombre,import.meta.url),'utf8'));
    }
    await inicial.execute("INSERT INTO establecimientos(id,nombre,fecha_registro) VALUES ('campo-test','Sintético','2026-01-01')");
    await inicial.execute({sql:`INSERT INTO usuarios(id,nombre,email,password_hash,rol,establecimiento_id,fecha_registro)
      VALUES (?,'Sintético',?,?,'productor','campo-test','2026-01-01')`,args:[productorSintetico.id,productorSintetico.email,productorSintetico.hash]});
  } finally {inicial.close();}
  const dbFactory=()=>createClient({url});
  const config={...configuracion(env),...productorSintetico},headers={cookie:cookieSesion(crearSesion(config)).split(';')[0],origin:config.origin,'content-type':'application/json'};
  const animales=crearRegistrosHandler('animales',{env,dbFactory});
  const alta=await llamar(animales,{method:'POST',headers,body:{operacionId:'op-real',versionBase:null,registro:{id:'animal-real',caravanaVisual:'LOCAL-001'}}});
  assert.equal(alta.statusCode,201);
  const lista=await llamar(animales,{headers});assert.equal(lista.statusCode,200);assert.equal(lista.body.animales[0].id,'animal-real');
  const pesajes=crearRegistrosHandler('pesajes',{env,dbFactory});
  const peso=await llamar(pesajes,{method:'POST',headers,body:{operacionId:'op-peso-real',versionBase:null,registro:{id:'peso-real',animalId:'animal-real',fecha:'2026-01-02',pesoKg:360}}});
  assert.equal(peso.statusCode,201);assert.equal(peso.body.registro.animalId,'animal-real');
