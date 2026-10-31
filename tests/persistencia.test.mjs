import test from 'node:test';
import assert from 'node:assert/strict';
import { crearPersistencia } from '../js/persistencia-mvp.js';

function preparar() {
  const datos = new Map(); let n = 0;
  const storage = { getItem: k => datos.get(k) ?? null, setItem: (k,v) => datos.set(k,v) };
  const abrir = () => crearPersistencia({storage, establecimientoId:'campo-test', crearId:() => 'op-'+(++n)});
  return { abrir, storage };
}

test('cambio offline sobrevive a recarga y descarga no lo sobrescribe', () => {
  const { abrir } = preparar(); const p = abrir();
  p.recibir('animales',{id:'animal-test',version:1,observaciones:'original'});
  p.cambiar('animales',{id:'animal-test',version:1,observaciones:'pendiente'});
  const recargada = abrir();
  recargada.recibir('animales',{id:'animal-test',version:2,observaciones:'otro dispositivo'});
  const estado = recargada.estado();
  assert.equal(Object.values(estado.registros)[0].observaciones,'pendiente');
  assert.equal(Object.values(estado.conflictos)[0].observaciones,'otro dispositivo');
  assert.equal(estado.pendientes[0].versionBase,1);
});

test('ACK conserva ID, limpia pendiente y tolera repetición; descarga antigua se ignora', () => {
  const { abrir } = preparar(); const p = abrir();
  const op = p.cambiar('animales',{id:'animal-test',observaciones:'nuevo'});
  assert.throws(() => p.confirmar(op.id,{id:'otro-id',version:1}), /cambiar el ID/);
  assert.equal(p.estado().pendientes.length,1);
  p.confirmar(op.id,{id:'animal-test',version:2,observaciones:'nuevo'});
  p.confirmar(op.id,{id:'animal-test',version:2});
  p.recibir('animales',{id:'animal-test',version:1,observaciones:'antiguo'});
  assert.equal(p.estado().pendientes.length,0);
  assert.equal(Object.values(p.estado().registros)[0].observaciones,'nuevo');
});

test('no confunde IDs por caravana ni descarta ediciones pendientes', () => {
  const { abrir } = preparar(); const p = abrir();
  p.cambiar('animales',{id:'local',caravanaVisual:'TEST-001'});
  p.recibir('animales',{id:'remoto',version:1,caravanaVisual:'TEST-001'});
  assert.equal(Object.keys(p.estado().registros).length,2);
  assert.equal(p.estado().pendientes[0].registroId,'local');
  p.cambiar('animales',{id:'local',caravanaVisual:'TEST-001',observaciones:'segunda edición'});
  assert.equal(p.estado().pendientes.length,2);
  assert.equal(p.estado().pendientes[1].dependeDe,p.estado().pendientes[0].id);
});

test('eliminación offline se conserva como operación y no borra al animal', () => {
  const { abrir } = preparar(); const p = abrir();
  p.recibir('animales',{id:'animal-test',version:1});
  p.cambiar('animales',{id:'animal-test',version:1,eliminado_en:'2026-01-04'});
  assert.equal(abrir().estado().pendientes[0].registro.eliminado_en,'2026-01-04');
  assert.equal(Object.values(p.estado().registros)[0].id,'animal-test');
});

test('fallo de almacenamiento y JSON corrupto se informan, sin asumir guardado', () => {
  const p = crearPersistencia({establecimientoId:'campo-test',crearId:()=> 'op',storage:{getItem:()=>null,setItem:()=>{throw new Error('Cuota agotada');}}});
  assert.throws(() => p.cambiar('animales',{id:'animal-test'}), /Cuota/);
  const rota = crearPersistencia({establecimientoId:'campo-test',storage:{getItem:()=>'{',setItem:()=>{assert.fail('No sobrescribir datos corruptos');}}});
  assert.throws(() => rota.estado(), SyntaxError);
});
