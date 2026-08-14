// Ping para que Supabase no pause el proyecto por inactividad.
//
// El plan free pausa a los 7 días sin actividad y, una vez pausado, no se
// reactiva solo: hay que restaurarlo a mano desde el dashboard, y mientras
// tanto la autenticación no responde y nadie puede iniciar sesión.
//
// Lo dispara el cron de Vercel definido en vercel.json. Va acá y no solo en
// GitHub Actions porque GitHub deshabilita los workflows programados en repos
// sin actividad por 60 días; Vercel no tiene esa regla.
//
// En JavaScript a propósito: las funciones serverless quedan fuera del proyecto
// TypeScript de la app (tsconfig incluye solo src/), y tiparlas obligaría a
// sumar @vercel/node como dependencia para un archivo de veinte líneas.

export default async function handler(req, res) {
  // Vercel manda este header automáticamente en las invocaciones del cron si
  // existe la variable CRON_SECRET. Si no está configurada, el endpoint queda
  // abierto: no expone datos, pero conviene definirla igual.
  const secreto = process.env.CRON_SECRET
  if (secreto && req.headers.authorization !== `Bearer ${secreto}`) {
    return res.status(401).json({ ok: false, error: 'No autorizado' })
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    return res.status(500).json({
      ok: false,
      error: 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno de Vercel',
    })
  }

  try {
    // Se consulta una tabla real para que Postgres ejecute la query. Con RLS
    // activa y sin sesión la respuesta es [], pero la actividad queda igual.
    const respuesta = await fetch(`${url}/rest/v1/vehiculos?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })

    if (!respuesta.ok) {
      return res.status(502).json({
        ok: false,
        estado: respuesta.status,
        error: 'Supabase no respondió OK. Puede estar pausado o caído.',
      })
    }

    return res.status(200).json({ ok: true, estado: respuesta.status })
  } catch (error) {
    return res.status(502).json({ ok: false, error: String(error) })
  }
}
