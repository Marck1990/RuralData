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
  const id = body.id || crearIdSimple();

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
      body.caravana_visual || "",
      body.codigo_rfid || "",
      body.categoria || "",
      body.sexo || "",
      body.raza || "",
      body.fecha_nacimiento || "",
      body.propietario || "",
      body.campo || "",
      body.observaciones || "",
      body.origen || "api",
      new Date().toISOString(),
      new Date().toISOString()
    ]
  });

  return res.status(201).json({
    ok: true,
    id: id
  });
}

function crearIdSimple() {
  if (globalThis.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "animal_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
}