// Contrato compartido: nombres originales del navegador y columnas SQLite.
export const modelos = {
  animales: {
    caravanaVisual:'caravana_visual',codigoRFID:'codigo_rfid',categoria:'categoria',sexo:'sexo',raza:'raza',
    fechaNacimiento:'fecha_nacimiento',propietario:'propietario',campo:'campo',observaciones:'observaciones',
    origen:'origen',estado:'estado',metodoIngreso:'metodo_ingreso',numeroGuiaImportacion:'numero_guia_importacion',
    fechaLecturaTxt:'fecha_lectura_txt',horaLecturaTxt:'hora_lectura_txt'
  },
  pesajes: {animalId:'animal_id',fecha:'fecha',pesoKg:'peso_kg',observaciones:'observaciones',origen:'origen'},
  sanidad: {
    animalId:'animal_id', identificacion:'identificacion', caravanaVisual:'caravana_visual', codigoRFID:'codigo_rfid',
    categoriaAnimal:'categoria_animal', propietarioAnimal:'propietario_animal', campoAnimal:'campo_animal',
    tipoControl:'tipo_control', producto:'producto', numeroHabilitacion:'numero_habilitacion',
    fechaAplicacion:'fecha_aplicacion', fechaProxima:'fecha_proxima', tieneCarencia:'tiene_carencia',
    diasCarencia:'dias_carencia', fechaLiberacion:'fecha_liberacion', dosis:'dosis',
    viaAdministracion:'via_administracion', veterinarioFirmante:'veterinario_firmante', observaciones:'observaciones'
  }
};
export function desdeSql(entidad,row) {
  const registro = {id:row.id,version:Number(row.version),eliminado_en:row.eliminado_en ?? null,
    fechaRegistro:row.fecha_registro,fechaActualizacion:row.fecha_actualizacion};
  for (const [local,columna] of Object.entries(modelos[entidad])) {
    if (local==='pesoKg' || local==='diasCarencia') registro[local]=Number(row[columna]);
    else if (local==='tieneCarencia') {
      const valor=Number(row[columna]);
      registro[local]=valor===0 ? false : valor===1 ? true : null;
    }
    else registro[local]=row[columna] ?? '';
  }
  return registro;
}
