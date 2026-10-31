import { abrirDb } from './db.js';
import { configuracion, autorizar, sinCache, responderError, HttpError } from './auth.js';
export function crearDiagnosticoHandler({env=process.env,dbFactory=()=>abrirDb(env)} = {}) {
  return async (req,res) => {
    sinCache(res); let db;
    try {
      const sesion=await autorizar(req,configuracion(env),dbFactory);db=sesion.db;
      if (req.method!=='GET') throw new HttpError(405,'Método no permitido');
      const resultado = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      return res.status(200).json({ok:true,tablas:resultado.rows});
    } catch(error) { return responderError(res,error); }
    finally { db?.close(); }
  };
}
