import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { basename, extname, join } from 'path';

const LOGOS_DIR = join(process.cwd(), 'uploads', 'logos');

// Solo imágenes rasterizadas. Servir con el Content-Type exacto y
// X-Content-Type-Options: nosniff evita MIME-sniffing y la ejecución de
// archivos HTML/SVG poliglotas en el origin (OWASP A03/A05).
const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

@Controller('uploads')
export class UploadsController {
  @Get(':filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    if (
      !filename ||
      filename === '.' ||
      filename === '..' ||
      basename(filename) !== filename ||
      !/^[a-zA-Z0-9._-]+$/.test(filename)
    ) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const filePath = join(LOGOS_DIR, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }

    const ext = extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext];

    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Nunca se permite que un archivo se renderice como HTML/SVG en el origin:
    // los que no sean imágenes válidas se fuerzan como descarga.
    if (!contentType) {
      res.setHeader('Content-Disposition', 'attachment');
    }
    // CSP de seguridad ante navegación directa a la URL del archivo.
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");

    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}