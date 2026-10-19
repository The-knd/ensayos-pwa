/**
 * Servicio externo de ejemplo para el módulo de sistema `mascotas`
 * (ver DESDE-CERO-GUIDE.md).
 *
 *   node mocks/mock-mascotas.mjs             # http://localhost:8005
 *   PORT=8015 node mocks/mock-mascotas.mjs   # otro puerto
 *
 *   GET /mascotas → JSON crudo (lo que el modal de la GUI imprime tal cual)
 *
 * Sin dependencias externas: solo `node:http`. No usar en producción.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 8005);

const RESPUESTA = {
  mascotas: [
    { id: 1, nombre: 'Luna', tipo: 'perro', raza: 'Mestizo', edad: 4, dueno: 'María Pérez' },
    { id: 2, nombre: 'Milo', tipo: 'gato', raza: 'Siames', edad: 2, dueno: 'Carlos Gómez' },
    { id: 3, nombre: 'Rocky', tipo: 'perro', raza: 'Labrador', edad: 7, dueno: 'Ana Ruiz' },
  ],
  total: 3,
  consultadoEn: new Date().toISOString(),
};

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  console.log(`${req.method} ${pathname}`);

  if (req.method === 'GET' && pathname === '/mascotas') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify(RESPUESTA, null, 2));
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: `ruta no encontrada: ${req.method} ${pathname}` }));
}).listen(PORT, () => {
  console.log(`Mock de Mascotas en http://localhost:${PORT} → GET /mascotas`);
});
