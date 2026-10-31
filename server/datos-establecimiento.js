// Solo recibe una sesión ya validada por autorizar(). No es un endpoint público.
const tablasPermitidas=new Set(['animales','pesajes','sanidad','reproduccion',
  'lotes_embarque','animales_lotes_embarque','txt_lista','txt_archivos']);
export async function listarDelEstablecimiento(sesion,tabla) {
  if(!tablasPermitidas.has(tabla) || !sesion.usuario?.id || !sesion.establecimientoId)throw new Error('Consulta sin ámbito autorizado');
  return sesion.db.execute({sql:`SELECT * FROM ${tabla} WHERE establecimiento_id=?`,args:[sesion.establecimientoId]});
}
