// Laboratorio local: siempre SQLite sintético, nunca importa .env ni usa Turso.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,writeFileSync,createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve,extname,sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { aplicarMigraciones } from './migraciones-locales.mjs';
import { crearRegistroHandler } from '../server/registro-handler.js';
import { crearSesionHandler } from '../server/sesion-handler.js';
import { crearRegistrosHandler } from '../server/registros-handler.js';
import { crearDiagnosticoHandler } from '../server/diagnostico-handler.js';

const raiz=fileURLToPath(new URL('../',import.meta.url));
const puerto=43187,origen=`http://localhost:${puerto}`;
const env={RURALDATA_SESSION_SECRET:randomBytes(48).toString('hex'),RURALDATA_ALLOWED_ORIGIN:'https://qa.ruraldata.test'};
const db=new DatabaseSync(':memory:');
db.exec(readFileSync(new URL('../tests/fixtures/esquema-original.sql',import.meta.url),'utf8'));
aplicarMigraciones(db);
const execute=async c=>{
  const {sql,args=[]}=typeof c==='string'?{sql:c}:c;const stmt=db.prepare(sql);
  if(stmt.columns().length)return {rows:stmt.all(...args),rowsAffected:0};
  return {rows:[],rowsAffected:Number(stmt.run(...args).changes)};
};
const adapter={execute,close(){},async transaction(){db.exec('BEGIN IMMEDIATE');return {execute,async commit(){db.exec('COMMIT');},async rollback(){db.exec('ROLLBACK');},close(){}};}};
const deps={env,dbFactory:()=>adapter};
const handlers={registro:crearRegistroHandler(deps),sesion:crearSesionHandler(deps),animales:crearRegistrosHandler('animales',deps),pesajes:crearRegistrosHandler('pesajes',deps),'test-db':crearDiagnosticoHandler(deps)};
let apiDisponible=true,sesionVencida=false,cola=Promise.resolve(),ultimoResultado=[];
const tipos={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.mp4':'video/mp4'};
const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
const leerBody=async req=>{let s='';for await(const c of req){s+=c;if(s.length>100000)throw new Error('Body demasiado grande');}return s?JSON.parse(s):{};};
const servidor=http.createServer(async(req,res)=>{
  try{
    if(req.headers.host!==`localhost:${puerto}`){json(res,403,{ok:false});return;}
    const url=new URL(req.url,origen);
    if(url.pathname==='/__prueba__/resultado' && req.method==='GET'){json(res,200,ultimoResultado);return;}
    if(url.pathname==='/__prueba__/control' && req.method==='POST'){
      if(req.headers.origin!==origen || req.headers['x-ruraldata-test']!=='local-only'){json(res,403,{ok:false});return;}
      const body=await leerBody(req);
      if(typeof body.apiDisponible==='boolean')apiDisponible=body.apiDisponible;
      if(typeof body.sesionVencida==='boolean')sesionVencida=body.sesionVencida;
      if(Array.isArray(body.resultados)){
        ultimoResultado=body.resultados.map(r=>({nombre:String(r.nombre),estado:String(r.estado),detalle:String(r.detalle||'')}));
        writeFileSync(new URL('../tests/browser/ultimo-resultado.json',import.meta.url),JSON.stringify(ultimoResultado,null,2)+'\n');
      }
      json(res,200,{ok:true});return;
    }
    if(url.pathname.startsWith('/api/')){
      const handler=handlers[url.pathname.slice(5)];if(!handler){json(res,404,{ok:false});return;}
      const body=await leerBody(req);
      const procesar=async()=>{
        if(!apiDisponible){json(res,503,{ok:false,error:'Fallo de API simulado en QA local'});return;}
        if(sesionVencida){json(res,401,{ok:false,error:'Sesión vencida simulada'});return;}
        // Adaptador SOLO de QA: traduce el Origin loopback al HTTPS sintético.
        // No cambia cookies Secure ni la validación de la aplicación productiva.
        const headers={...req.headers};if(headers.origin===origen)headers.origin=env.RURALDATA_ALLOWED_ORIGIN;
        const respuesta={setHeader:(...args)=>res.setHeader(...args),status(n){res.statusCode=n;return this;},json(b){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(b));return this;}};
        await handler({method:req.method,headers,body,query:Object.fromEntries(url.searchParams),socket:req.socket},respuesta);
      };
      cola=cola.then(procesar,procesar);await cola;return;
    }
    let ruta=decodeURIComponent(url.pathname);if(ruta==='/')ruta='/tests/browser/harness.html';
    if(ruta.split('/').includes('..') || ruta.includes('\\')){res.writeHead(403);res.end();return;}
    if(!/^\/(?:index\.html|login\.html|registro-usuario\.html|manifest\.json|service-worker\.js|(?:pages|js|css|assets|tests\/browser)\/)/.test(ruta)){res.writeHead(404);res.end();return;}
    const archivo=resolve(raiz,'.'+ruta);if(!archivo.startsWith(raiz.endsWith(sep)?raiz:raiz+sep)){res.writeHead(403);res.end();return;}
    const tipo=tipos[extname(archivo)]||'application/octet-stream';res.setHeader('Content-Type',tipo);res.setHeader('Cache-Control','no-store');
    if(archivo.endsWith('.html') && !ruta.startsWith('/tests/browser/')){
      const html=readFileSync(archivo,'utf8').replace('<head>','<head><script src="/tests/browser/instrumentar.js"></script>');res.end(html);return;
    }
    const stream=createReadStream(archivo);stream.on('error',()=>{if(!res.headersSent)res.statusCode=404;res.end();});stream.pipe(res);
  }catch{if(!res.headersSent)json(res,500,{ok:false,error:'Error en laboratorio local'});else res.end();}
});
servidor.listen(puerto,'127.0.0.1',()=>console.log(`QA sintético listo: ${origen}/ (sin Turso, SQLite en memoria)`));
process.on('SIGINT',()=>servidor.close(()=>{db.close();process.exit(0);}));
