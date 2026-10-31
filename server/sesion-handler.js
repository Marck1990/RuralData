import { abrirDb } from './db.js';
import { configuracion, crearSesion, cookieSesion, autorizar, origenValido, verificarPassword,
  limitarAcceso, normalizarEmail, perfilPublico, sinCache, responderError, HttpError } from './auth.js';

// Hash sintético para igualar el costo de una cuenta inexistente o hash antiguo
// incompatible. No es una credencial válida de ninguna cuenta.
const HASH_INEXISTENTE='scrypt$'+'0'.repeat(32)+'$'+'0'.repeat(128);

export function crearSesionHandler({env=process.env,dbFactory=()=>abrirDb(env),now=()=>Date.now()} = {}) {
  return async (req,res) => {
    sinCache(res); let db;
    try {
      const config = configuracion(env);
      if (req.method==='GET' || req.method==='DELETE') {
        const sesion=await autorizar(req,config,dbFactory,now());db=sesion.db;
        if(req.method==='GET')return res.status(200).json({ok:true,perfil:perfilPublico(sesion.usuario)});
        res.setHeader('Set-Cookie',cookieSesion('',true));return res.status(200).json({ok:true});
      }
      if (req.method!=='POST') throw new HttpError(405,'Método no permitido');
      origenValido(req,config);
      if (!req.headers?.['content-type']?.startsWith('application/json')) throw new HttpError(415,'Se requiere JSON');
      const email=normalizarEmail(req.body?.email ?? req.body?.usuario);
      db = dbFactory(); await limitarAcceso(db,config,req,'login',email,now());
      const encontrados=(await db.execute({sql:`SELECT u.id,u.nombre,u.email,u.password_hash,u.establecimiento_id,u.activo
        FROM usuarios u JOIN establecimientos e ON e.id=u.establecimiento_id WHERE u.email_normalizado=? OR
        (u.email_normalizado IS NULL AND LOWER(TRIM(u.email))=?)`,args:[email,email]})).rows;
      const usuario=encontrados.length===1 ? encontrados[0] : null;
      const hashCompatible=/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(usuario?.password_hash || '');
      const valida = await verificarPassword(req.body?.password,hashCompatible ? usuario.password_hash : HASH_INEXISTENTE);
      if (!valida || !hashCompatible || Number(usuario?.activo)!==1) throw new HttpError(401,'Credenciales incorrectas');
      res.setHeader('Set-Cookie',cookieSesion(crearSesion({...config,id:usuario.id,hash:usuario.password_hash},now())));
      return res.status(200).json({ok:true,perfil:perfilPublico(usuario)});
    } catch(error) { return responderError(res,error); }
    finally { db?.close(); }
  };
}
