import { randomUUID } from 'node:crypto';
import { abrirDb } from './db.js';
import { configuracion,origenValido,normalizarEmail,hashPassword,limitarAcceso,
  sinCache,responderError,HttpError } from './auth.js';

export function crearRegistroHandler({env=process.env,dbFactory=()=>abrirDb(env),now=()=>Date.now()}={}) {
  return async(req,res)=>{
    sinCache(res);let db,tx;
    try {
      const config=configuracion(env);
      if(req.method!=='POST')throw new HttpError(405,'Método no permitido');
      origenValido(req,config);
      if(!req.headers?.['content-type']?.startsWith('application/json'))throw new HttpError(415,'Se requiere JSON');
      const email=normalizarEmail(req.body?.email);
      const {nombre,nombreEstablecimiento,password}=req.body || {};
      if(typeof nombre!=='string' || !nombre.trim() || nombre.length>120 ||
        typeof nombreEstablecimiento!=='string' || !nombreEstablecimiento.trim() || nombreEstablecimiento.length>160)throw new HttpError(400,'Completá nombre y establecimiento');
      if(typeof password!=='string' || password.length<12 || password.length>256)throw new HttpError(400,'Usá una contraseña de 12 a 256 caracteres');
      // No aceptar asignaciones de establecimiento, ID o permisos del navegador.
      if(['id','establecimiento_id','establecimientoId','rol'].some(k=>req.body[k]!==undefined))throw new HttpError(400,'El servidor asigna la cuenta y su establecimiento');
      db=dbFactory();await limitarAcceso(db,config,req,'registro',email,now());
      const hash=await hashPassword(password);
      tx=await db.transaction('write');
      const existente=await tx.execute({sql:`SELECT id FROM usuarios WHERE email_normalizado=? OR
        (email_normalizado IS NULL AND LOWER(TRIM(email))=?)`,args:[email,email]});
      if(existente.rows.length)throw new HttpError(409,'No se pudo registrar ese correo; probá iniciar sesión');
      const id=randomUUID(),establecimientoId=randomUUID(),fecha=new Date(now()).toISOString();
      await tx.execute({sql:'INSERT INTO establecimientos(id,nombre,fecha_registro) VALUES (?,?,?)',args:[establecimientoId,nombreEstablecimiento.trim(),fecha]});
      await tx.execute({sql:`INSERT INTO usuarios(id,nombre,email,email_normalizado,password_hash,rol,establecimiento_id,activo,fecha_registro)
        VALUES (?,?,?,?,?,'productor',?,1,?)`,args:[id,nombre.trim(),email,email,hash,establecimientoId,fecha]});
      await tx.commit();
      // Registro no inicia ni sustituye la sesión de otra pestaña.
      return res.status(201).json({ok:true});
    }catch(error){
      if(tx){try{await tx.rollback();}catch{}}
      return responderError(res,error);
    }finally{tx?.close();db?.close();}
  };
}
