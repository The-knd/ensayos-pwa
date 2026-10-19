/**
 * API externo de ejemplo para el módulo `peliculas` (ver DESDE-CERO-GUIDE.md).
 *
 *   node mocks/mock-peliculas.mjs            # http://localhost:8006
 *   PORT=8007 node mocks/mock-peliculas.mjs  # otro puerto
 *
 * Réplica en Node (sin dependencias) de la API demo `apis-base` —la misma que
 * sirve `/mascotas` en :8005— para poder probar el módulo sin tenerla:
 *
 *   POST {base}/login             {username,password}  → {access_token,...} (401 si no)
 *   POST {base}/logout            Authorization: Bearer                     → {mensaje}
 *   GET  {base}/peliculas         Authorization: Bearer                     → {usuario,total,peliculas:[{id,titulo}]}
 *   GET  {base}/empresa1/peliculas Authorization: Bearer                    → {resultados:[{codigo,nombre,anio,genero}]}
 *
 * La última ruta es la del contrato de la estrategia `empresa1` (otra empresa,
 * otro formato): el backend la pide si la conexión usa `settings.strategy=empresa1`
 * y `baseUrl=http://localhost:8006/empresa1`.
 *
 * Usuarios: ana/ana123 · luis/luis123 · maria/maria123 · pedro/pedro123
 * No usar en producción.
 */
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT ?? 8006);
const SESSION_SECONDS = 3600;

const USUARIOS = {
  ana: { password: 'ana123', nombre: 'Ana', empresa_id: 'empresa_a' },
  luis: { password: 'luis123', nombre: 'Luis', empresa_id: 'empresa_a' },
  maria: { password: 'maria123', nombre: 'María', empresa_id: 'empresa_b' },
  pedro: { password: 'pedro123', nombre: 'Pedro', empresa_id: null },
};

const EMPRESAS = {
  empresa_a: { id: 'empresa_a', nombre: 'Empresa A' },
  empresa_b: { id: 'empresa_b', nombre: 'Empresa B' },
};

const PELICULAS = {
  1: { id: 1, titulo: 'Matrix' },
  2: { id: 2, titulo: 'Interestelar' },
  3: { id: 3, titulo: 'Toy Story' },
  4: { id: 4, titulo: 'Coco' },
  5: { id: 5, titulo: 'El viaje de Chihiro' },
  6: { id: 6, titulo: 'Jurassic Park' },
};

const PELICULAS_POR_EMPRESA = { empresa_a: [1, 2], empresa_b: [3, 4] };
const PELICULAS_POR_USUARIO = { ana: [5], luis: [6], maria: [5], pedro: [2, 6] };

// Contrato de la estrategia `empresa1` (formato distinto, otra empresa).
const RESULTADOS = [
  { codigo: 'P-001', nombre: 'El secreto de sus ojos', anio: 2009, genero: 'Policial' },
  { codigo: 'P-002', nombre: 'Relatos salvajes', anio: 2014, genero: 'Comedia' },
  { codigo: 'P-003', nombre: 'La historia oficial', anio: 1985, genero: 'Drama' },
];

const sesiones = new Map(); // token -> { username, expires_at }

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function sinSesion(res, detalle) {
  res.setHeader('WWW-Authenticate', 'Bearer');
  return json(res, 401, { detail: detalle });
}

function usuarioPublico(username) {
  const u = USUARIOS[username];
  return { username, nombre: u.nombre, empresa: EMPRESAS[u.empresa_id] ?? null };
}

function leerBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sesionDe(req) {
  const token = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const sesion = sesiones.get(token);
  if (!sesion) return null;
  if (sesion.expires_at <= Date.now()) {
    sesiones.delete(token);
    return null;
  }
  return { token, username: sesion.username };
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  console.log(`${req.method} ${pathname}`);

  // POST /login
  if (req.method === 'POST' && pathname === '/login') {
    const { username, password } = await leerBody(req);
    const usuario = USUARIOS[username];
    const candidata = Buffer.from(String(password ?? ''));
    // timingSafeEqual exige igual longitud: comparar longitudes primero.
    const ok =
      usuario &&
      candidata.length === Buffer.byteLength(usuario.password) &&
      timingSafeEqual(candidata, Buffer.from(usuario.password));
    if (!ok) return sinSesion(res, 'Usuario o contraseña incorrectos');
    const token = randomBytes(24).toString('base64url');
    sesiones.set(token, { username, expires_at: Date.now() + SESSION_SECONDS * 1000 });
    return json(res, 200, {
      access_token: token,
      token_type: 'bearer',
      expires_in: SESSION_SECONDS,
      usuario: usuarioPublico(username),
    });
  }

  // POST /logout
  if (req.method === 'POST' && pathname === '/logout') {
    const sesion = sesionDe(req);
    if (!sesion) return sinSesion(res, 'Token inválido o sesión cerrada');
    sesiones.delete(sesion.token);
    return json(res, 200, { mensaje: 'Sesión cerrada correctamente' });
  }

  // GET /peliculas  (o /empresa1/peliculas con el contrato de `empresa1`)
  if (req.method === 'GET' && pathname.endsWith('/peliculas')) {
    const sesion = sesionDe(req);
    if (!sesion) return sinSesion(res, 'Token inválido o sesión cerrada');

    if (pathname.split('/').filter(Boolean).includes('empresa1')) {
      return json(res, 200, { resultados: RESULTADOS });
    }

    const { username } = sesion;
    const ids = [
      ...new Set([...(PELICULAS_POR_EMPRESA[USUARIOS[username].empresa_id] ?? []), ...(PELICULAS_POR_USUARIO[username] ?? [])]),
    ];
    const peliculas = ids.map((id) => PELICULAS[id]);
    return json(res, 200, { usuario: usuarioPublico(username), total: peliculas.length, peliculas });
  }

  return json(res, 404, { detail: `ruta no encontrada: ${req.method} ${pathname}` });
}).listen(PORT, () => {
  console.log(`Mock de Películas (réplica de la API demo) en http://localhost:${PORT}`);
  console.log('  usuarios: ana/ana123 · luis/luis123 · maria/maria123 · pedro/pedro123');
});
