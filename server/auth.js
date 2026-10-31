import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derivar = promisify(scrypt);
export const COOKIE = '__Host-ruraldata';
const DURACION = 12 * 60 * 60;
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function configuracion(env) {
  const {RURALDATA_SESSION_SECRET:secret, RURALDATA_ALLOWED_ORIGIN:origin} = env;
  if (!secret || secret.length < 32 || !origin) throw new HttpError(503,'Autenticación sin configurar');
  let url; try { url = new URL(origin); } catch { throw new HttpError(503,'Origen sin configurar'); }
  if (url.origin !== origin || url.protocol !== 'https:') throw new HttpError(503,'Se requiere origen HTTPS');
  return {secret,origin};
}
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Usar entre 12 y 256 caracteres');
  const salt = randomBytes(16).toString('hex');
  const key = await derivar(password,salt,64,{N:16384,r:8,p:1});
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verificarPassword(password, hash) {
  if (typeof password !== 'string' || password.length > 256 ||
      !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash || '')) return false;
  const [,salt,esperado] = hash.split('$');
  const key = await derivar(password,salt,64,{N:16384,r:8,p:1});
  return timingSafeEqual(key,Buffer.from(esperado,'hex'));
}
const firma = (valor, config) => createHmac('sha256',config.secret).update(valor).digest('base64url');
export function crearSesion(config, ahora = Date.now()) {
  const payload = Buffer.from(JSON.stringify({v:2,sub:config.id,cred:firma(config.hash,config),
    iat:Math.floor(ahora/1000),exp:Math.floor(ahora/1000)+DURACION})).toString('base64url');
  return `${payload}.${firma(payload,config)}`;
}
export function cookieSesion(token, borrar = false) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${borrar ? 0 : DURACION}`;
}
export function origenValido(req, config) {
  if (req.headers?.origin !== config.origin) throw new HttpError(403,'Origen no autorizado');
}
export function leerSesion(req, config, ahora = Date.now()) {
  const cookies = String(req.headers?.cookie || '').split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));
  const token = cookies.length === 1 ? cookies[0].slice(COOKIE.length+1) : '';
  try {
    if (token.length > 2048) throw new Error();
    const [payload, sig, extra] = token.split('.');
    if (!payload || !sig || extra) throw new Error();
    const esperado = Buffer.from(firma(payload,config)); const recibido = Buffer.from(sig);
    if (esperado.length !== recibido.length || !timingSafeEqual(esperado,recibido)) throw new Error();
    const datos = JSON.parse(Buffer.from(payload,'base64url').toString());
    const segundos = Math.floor(ahora/1000);
    if (datos.v!==2 || typeof datos.sub!=='string' || !datos.sub || typeof datos.cred!=='string' ||
        !Number.isInteger(datos.iat) || !Number.isInteger(datos.exp) || datos.exp<=segundos ||
        datos.iat>segundos || datos.exp-datos.iat!==DURACION) throw new Error();
    return datos;
  } catch { throw new HttpError(401,'Iniciá sesión para sincronizar'); }
}
export async function autorizar(req, config, dbFactory, ahora = Date.now()) {
  const datos=leerSesion(req,config,ahora);
  if (!['GET','HEAD'].includes(req.method)) origenValido(req,config);
  const db=dbFactory();
  try {
    const usuario=(await db.execute({sql:`SELECT u.id,u.nombre,u.email,u.password_hash,u.establecimiento_id
      FROM usuarios u JOIN establecimientos e ON e.id=u.establecimiento_id WHERE u.id=? AND u.activo=1`,args:[datos.sub]})).rows[0];
    if (!usuario || datos.cred!==firma(usuario.password_hash,config)) throw new HttpError(401,'Sesión vencida o cuenta inactiva');
    const establecimientoId=usuario.establecimiento_id;
    for(const valor of [req.body?.establecimiento_id,req.body?.establecimientoId,req.query?.establecimiento_id,
      req.query?.establecimientoId,req.headers?.['x-ruraldata-establecimiento']]) {
      if(valor!==undefined && valor!==establecimientoId)throw new HttpError(403,'Establecimiento no autorizado');
    }
    if(req.headers?.['x-ruraldata-usuario']!==undefined && req.headers['x-ruraldata-usuario']!==usuario.id)throw new HttpError(403,'La cuenta activa cambió; se conserva la cola');
    return {db,usuario,establecimientoId};
  } catch(error) {db.close();throw error;}
}
export const perfilPublico = usuario => ({id:usuario.id,nombre:usuario.nombre,email:usuario.email,
  establecimientoId:usuario.establecimiento_id,autenticacionMvp:true});
export function normalizarEmail(valor) {
  if(typeof valor!=='string' || valor.length>254)throw new HttpError(400,'Ingresá un correo válido');
  const email=valor.trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Ingresá un correo válido');
  return email;
}
export function sinCache(res) { res.setHeader('Cache-Control','no-store'); }
export function responderError(res,error) {
  return res.status(error instanceof HttpError ? error.status : 503)
    .json({ok:false,error:error instanceof HttpError ? error.message : 'Servicio no disponible; se conservan los datos locales'});
}

// Contadores durables por origen de red y por email. Las claves se seudonimizan.
export async function limitarLogin(db, config, ahora, clave, limite=10) {
  const ventana = Math.floor(ahora/(15*60*1000));
  const resultado = await db.execute({sql:`INSERT INTO auth_intentos(clave,ventana,cantidad) VALUES (?, ?, 1)
    ON CONFLICT(clave) DO UPDATE SET cantidad=CASE WHEN ventana=excluded.ventana THEN cantidad+1 ELSE 1 END,
    ventana=excluded.ventana RETURNING cantidad`,args:[firma(clave,config),ventana]});
  if (Number(resultado.rows[0].cantidad)>limite) throw new HttpError(429,'Demasiados intentos; esperá 15 minutos');
}
export async function limitarAcceso(db,config,req,accion,email,ahora) {
  // El socket procede del servidor; no se confía en X-Forwarded-For del cliente.
  const origen=req.socket?.remoteAddress || 'origen-no-disponible';
  await limitarLogin(db,config,ahora,accion+':ip:'+origen,accion==='registro'?5:50);
  await limitarLogin(db,config,ahora,accion+':email:'+email,10);
}
