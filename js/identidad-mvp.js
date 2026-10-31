// Identidad de caché, no autorización. La autorización siempre la decide la API.
export function espacioProductor(perfil) {
  if(!perfil?.autenticacionMvp || !perfil.id || !perfil.establecimientoId)throw new Error('Falta sesión del productor');
  return 'productor_'+encodeURIComponent(perfil.id)+'_establecimiento_'+encodeURIComponent(perfil.establecimientoId);
}
export function mismaIdentidad(a,b) {
  return !!a && !!b && a.id===b.id && a.establecimientoId===b.establecimientoId;
}
