// Contrato compartido: nombres originales del navegador y columnas SQLite.
export const modelos = {
  animales: {
    caravanaVisual:'caravana_visual',codigoRFID:'codigo_rfid',categoria:'categoria',sexo:'sexo',raza:'raza',
    fechaNacimiento:'fecha_nacimiento',propietario:'propietario',campo:'campo',observaciones:'observaciones',
    origen:'origen',estado:'estado',metodoIngreso:'metodo_ingreso',numeroGuiaImportacion:'numero_guia_importacion',
    fechaLecturaTxt:'fecha_lectura_txt',horaLecturaTxt:'hora_lectura_txt'
  },
  pesajes: {animalId:'animal_id',fecha:'fecha',pesoKg:'peso_kg',observaciones:'observaciones',origen:'origen'}
};
export function desdeSql(entidad,row) {
  const registro = {id:row.id,version:Number(row.version),eliminado_en:row.eliminado_en ?? null,
    fechaRegistro:row.fecha_registro,fechaActualizacion:row.fecha_actualizacion};
  for (const [local,columna] of Object.entries(modelos[entidad])) {
    registro[local] = local==='pesoKg' ? Number(row[columna]) : (row[columna] ?? '');
  }
  return registro;
}
