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
      return await listarPesajes(req, res);
    }

    if (req.method === "POST") {
      return await guardarPesaje(req, res);
    }

    if (req.method === "DELETE") {
      return await eliminarPesaje(req, res);
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

async function listarPesajes(req, res) {
  const db = crearConexion();
  const establecimientoId = req.query.establecimiento_id || "demo_ruraldata";

  const resultado = await db.execute({
    sql: `
      SELECT *
      FROM pesajes
      WHERE establecimiento_id = ?
      ORDER BY fecha DESC, fecha_registro DESC;
    `,
    args: [establecimientoId]
  });

  return res.status(200).json({
    ok: true,
    pesajes: resultado.rows
  });
}

async function guardarPesaje(req, res) {
  const db = crearConexion();
  const body = req.body || {};

  const id = limpiarTextoApi(body.id) || crearIdSimple();
  const establecimientoId = body.establecimiento_id || "demo_ruraldata";
  const animalId = limpiarTextoApi(body.animal_id);
  const fecha = limpiarTextoApi(body.fecha);
  const pesoKg = Number(body.peso_kg);
  const ahora = new Date().toISOString();

  if (animalId === "") {
    return res.status(400).json({
      ok: false,
      error: "Falta el animal_id."
    });
  }

  if (fecha === "") {
    return res.status(400).json({
      ok: false,
      error: "Falta la fecha del pesaje."
    });
  }

  if (isNaN(pesoKg) || pesoKg <= 0) {
    return res.status(400).json({
      ok: false,
      error: "Peso inválido."
    });
  }

  const existente = await buscarPesajePorId(db, establecimientoId, id);

  if (existente) {
    await db.execute({
      sql: `
        UPDATE pesajes
        SET
          animal_id = ?,
          fecha = ?,
          peso_kg = ?,
          observaciones = ?,
          origen = ?,
          fecha_actualizacion = ?
        WHERE id = ?
        AND establecimiento_id = ?;
      `,
      args: [
        animalId,
        fecha,
        pesoKg,
        limpiarTextoApi(body.observaciones),
        limpiarTextoApi(body.origen || "ruraldata_app"),
        ahora,
        id,
        establecimientoId
      ]
    });

    return res.status(200).json({
      ok: true,
      id: id,
      actualizado: true
    });
  }

  await db.execute({
    sql: `
      INSERT INTO pesajes (
        id,
        establecimiento_id,
        animal_id,
        fecha,
        peso_kg,
        observaciones,
        origen,
        fecha_registro,
        fecha_actualizacion
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    args: [
      id,
      establecimientoId,
      animalId,
      fecha,
      pesoKg,
      limpiarTextoApi(body.observaciones),
      limpiarTextoApi(body.origen || "ruraldata_app"),
      ahora,
      ahora
    ]
  });

  return res.status(201).json({
    ok: true,
    id: id,
    actualizado: false
  });
}

async function eliminarPesaje(req, res) {
  const db = crearConexion();

  const id = limpiarTextoApi(req.query.id);
  const establecimientoId = req.query.establecimiento_id || "demo_ruraldata";

  if (id === "") {
    return res.status(400).json({
      ok: false,
      error: "Falta el id del pesaje."
    });
  }

  await db.execute({
    sql: `
      DELETE FROM pesajes
      WHERE id = ?
      AND establecimiento_id = ?;
    `,
    args: [id, establecimientoId]
  });

  return res.status(200).json({
    ok: true,
    id: id
  });
}

async function buscarPesajePorId(db, establecimientoId, id) {
  const resultado = await db.execute({
    sql: `
      SELECT id
      FROM pesajes
      WHERE id = ?
      AND establecimiento_id = ?
      LIMIT 1;
    `,
    args: [id, establecimientoId]
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

  return "pesaje_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}