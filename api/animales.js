import { createClient } from "@libsql/client";

function crearConexion() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
}

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "Faltan variables de entorno de Turso."
      });
    }

    if (req.method === "GET") {
      return await listarAnimales(req, res);
    }

    if (req.method === "POST") {
      return await crearAnimal(req, res);
    }

    if (req.method === "PUT") {
      return await actualizarAnimal(req, res);
    }

    return res.status(405).json({
      ok: false,
      error: "Método no permitido."
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}

async function listarAnimales(req, res) {
  const db = crearConexion();

  const establecimientoId = req.query.establecimiento_id || "demo_ruraldata";

  const resultado = await db.execute({
    sql: `
      SELECT *
      FROM animales
      WHERE establecimiento_id = ?
      ORDER BY fecha_registro DESC;
    `,
    args: [establecimientoId]
  });

  return res.status(200).json({
    ok: true,
    animales: resultado.rows
  });
}

async function crearAnimal(req, res) {
  const db = crearConexion();
  const body = req.body || {};

  const establecimientoId = body.establecimiento_id || "demo_ruraldata";
  const caravanaVisual = limpiarTextoApi(body.caravana_visual);
  const codigoRfid = limpiarTextoApi(body.codigo_rfid);

  if (caravanaVisual === "" && codigoRfid === "") {
    return res.status(400).json({
      ok: false,
      error: "Debe ingresar caravana visual o RFID."
    });
  }

  const duplicado = await buscarAnimalDuplicado(
    db,
    establecimientoId,
    caravanaVisual,
    codigoRfid,
    ""
  );

  if (duplicado) {
    return res.status(200).json({
      ok: true,
      duplicado: true,
      id: duplicado.id,
      mensaje: "El animal ya existía en Turso."
    });
  }

  const id = body.id || crearIdSimple();
  const ahora = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO animales (
        id,
        establecimiento_id,
        caravana_visual,
        codigo_rfid,
        categoria,
        sexo,
        raza,
        fecha_nacimiento,
        propietario,
        campo,
        observaciones,
        origen,
        fecha_registro,
        fecha_actualizacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: [
      id,
      establecimientoId,
      caravanaVisual,
      codigoRfid,
      limpiarTextoApi(body.categoria),
      limpiarTextoApi(body.sexo),
      limpiarTextoApi(body.raza),
      limpiarTextoApi(body.fecha_nacimiento),
      limpiarTextoApi(body.propietario),
      limpiarTextoApi(body.campo),
      limpiarTextoApi(body.observaciones),
      limpiarTextoApi(body.origen || "api"),
      ahora,
      ahora
    ]
  });

  return res.status(201).json({
    ok: true,
    duplicado: false,
    id: id
  });
}

async function actualizarAnimal(req, res) {
  const db = crearConexion();
  const body = req.body || {};

  const id = limpiarTextoApi(body.id);
  const establecimientoId = body.establecimiento_id || "demo_ruraldata";
  const caravanaVisual = limpiarTextoApi(body.caravana_visual);
  const codigoRfid = limpiarTextoApi(body.codigo_rfid);

  if (id === "") {
    return res.status(400).json({
      ok: false,
      error: "Falta el id del animal."
    });
  }

  if (caravanaVisual === "" && codigoRfid === "") {
    return res.status(400).json({
      ok: false,
      error: "Debe ingresar caravana visual o RFID."
    });
  }

  const existente = await buscarAnimalPorId(db, establecimientoId, id);

  if (!existente) {
    return res.status(404).json({
      ok: false,
      error: "El animal no existe en Turso."
    });
  }

  const duplicado = await buscarAnimalDuplicado(
    db,
    establecimientoId,
    caravanaVisual,
    codigoRfid,
    id
  );

  if (duplicado) {
    return res.status(409).json({
      ok: false,
      duplicado: true,
      id: duplicado.id,
      error: "Ya existe otro animal con esa caravana o RFID."
    });
  }

  const ahora = new Date().toISOString();

  await db.execute({
    sql: `
      UPDATE animales
      SET
        caravana_visual = ?,
        codigo_rfid = ?,
        categoria = ?,
        sexo = ?,
        raza = ?,
        fecha_nacimiento = ?,
        propietario = ?,
        campo = ?,
        observaciones = ?,
        origen = ?,
        fecha_actualizacion = ?
      WHERE id = ?
      AND establecimiento_id = ?;
    `,
    args: [
      caravanaVisual,
      codigoRfid,
      limpiarTextoApi(body.categoria),
      limpiarTextoApi(body.sexo),
      limpiarTextoApi(body.raza),
      limpiarTextoApi(body.fecha_nacimiento),
      limpiarTextoApi(body.propietario),
      limpiarTextoApi(body.campo),
      limpiarTextoApi(body.observaciones),
      limpiarTextoApi(body.origen || "ruraldata_app"),
      ahora,
      id,
      establecimientoId
    ]
  });

  return res.status(200).json({
    ok: true,
    id: id
  });
}

async function buscarAnimalPorId(db, establecimientoId, id) {
  const resultado = await db.execute({
    sql: `
      SELECT id
      FROM animales
      WHERE establecimiento_id = ?
      AND id = ?
      LIMIT 1;
    `,
    args: [establecimientoId, id]
  });

  if (resultado.rows.length > 0) {
    return resultado.rows[0];
  }

  return null;
}

async function buscarAnimalDuplicado(db, establecimientoId, caravanaVisual, codigoRfid, idExcluir) {
  const condiciones = [];
  const args = [establecimientoId];

  let sql = `
    SELECT id
    FROM animales
    WHERE establecimiento_id = ?
  `;

  if (idExcluir !== "") {
    sql += `
      AND id <> ?
    `;
    args.push(idExcluir);
  }

  if (caravanaVisual !== "") {
    condiciones.push("LOWER(TRIM(caravana_visual)) = LOWER(TRIM(?))");
    args.push(caravanaVisual);
  }

  if (codigoRfid !== "") {
    condiciones.push("LOWER(TRIM(codigo_rfid)) = LOWER(TRIM(?))");
    args.push(codigoRfid);
  }

  if (condiciones.length === 0) {
    return null;
  }

  sql += `
    AND (${condiciones.join(" OR ")})
    LIMIT 1;
  `;

  const resultado = await db.execute({
    sql: sql,
    args: args
  });

  if (resultado.rows.length > 0) {
    return resultado.rows[0];
  }

  return null;
}

function limpiarTextoApi(valor) {
  return String(valor || "").trim();
}

function crearIdSimple() {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "animal_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}