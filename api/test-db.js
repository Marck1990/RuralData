import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  try {
    if (!process.env.TURSO_DATABASE_URL) {
      return res.status(500).json({
        ok: false,
        error: "Falta TURSO_DATABASE_URL en Vercel"
      });
    }

    if (!process.env.TURSO_AUTH_TOKEN) {
      return res.status(500).json({
        ok: false,
        error: "Falta TURSO_AUTH_TOKEN en Vercel"
      });
    }

    const db = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    const resultado = await db.execute(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
      ORDER BY name;
    `);

    return res.status(200).json({
      ok: true,
      tablas: resultado.rows
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}