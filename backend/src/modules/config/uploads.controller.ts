import { Controller, Get, Param, NotFoundException, Res } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Controller('uploads')
export class UploadsController {
  @Get(':filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado');
    }
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}