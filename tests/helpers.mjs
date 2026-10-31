import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { aplicarMigraciones } from '../scripts/migraciones-locales.mjs';
import { hashPassword } from '../server/auth.js';

export const passwordSintetica='Clave de prueba 123!';
export const envSintetico={
  RURALDATA_SESSION_SECRET:'secreto-sintetico-exclusivo-de-pruebas-12345',
  RURALDATA_ALLOWED_ORIGIN:'https://ruraldata.test'
};
export const productorSintetico={id:'productor-test',email:'productor@test.local',establecimientoId:'campo-test',hash:await hashPassword(passwordSintetica)};
export function baseSintetica(t) {
  const db=new DatabaseSync(':memory:');t.after(()=>db.close());
  db.exec(readFileSync(new URL('./fixtures/esquema-original.sql',import.meta.url),'utf8'));
  aplicarMigraciones(db);
  db.exec("INSERT INTO establecimientos(id,nombre,fecha_registro) VALUES ('campo-test','Campo sintético','2026-01-01'),('otro-campo','Otro sintético','2026-01-01')");
  db.prepare(`INSERT INTO usuarios(id,nombre,email,password_hash,rol,establecimiento_id,fecha_registro)
    VALUES (?,?,?,?,?,'campo-test','2026-01-01')`).run(productorSintetico.id,'Productor sintético',productorSintetico.email,productorSintetico.hash,'valor-historico');
  const execute=async consulta=>{
    const {sql,args=[]}=typeof consulta==='string'?{sql:consulta}:consulta;
    const stmt=db.prepare(sql);
    if(stmt.columns().length)return {rows:stmt.all(...args),rowsAffected:0};
    const result=stmt.run(...args);return {rows:[],rowsAffected:Number(result.changes)};
  };
  const adapter={execute,close(){},async transaction(){
    db.exec('BEGIN IMMEDIATE');return {execute,async commit(){db.exec('COMMIT');},async rollback(){db.exec('ROLLBACK');},close(){}};
  }};
  return {db,dbFactory:()=>adapter};
}
export async function llamar(handler,{method='GET',body,headers={},query={}}={}) {
  const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k.toLowerCase()]=v;},status(n){this.statusCode=n;return this;},json(datos){this.body=datos;return this;}};
  const normalizadas=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
  await handler({method,body,headers:normalizadas,query},res);return res;
}
export function memoria() {
  const map=new Map();return {get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}
