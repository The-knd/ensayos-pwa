import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readSync,
  readdirSync,
  renameSync,
  unlinkSync,
} from 'fs';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { ConfigService } from './config.service';
import { CreateCompanyDto } from './dto/company.dto';
import { RbacService } from '../rbac/rbac.service';
import { ModulePlacementsService } from '../placements/module-placements.service';
import { SUPER_ADMIN_PROFILE_ID } from '../../commons/constants';

const LOGOS_DIR = join(process.cwd(), 'uploads', 'logos');
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// Únicamente imágenes rasterizadas. SVG quedaría FUERA a propósito: un SVG
// servido same-origin puede contener <script> (stored XSS, OWASP A03/A05).
const ALLOWED_LOGO_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function ensureLogosDir(): string {
  if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });
  return LOGOS_DIR;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

/**
 * Extensión del archivo. Solo se confía en la extensión para un primer filtro
 * en fileFilter; la validación de contenido (magic bytes) ocurre después de
 * escribirlo en disco en detectStoredImageType().
 */
function allowedDeclaredExt(file: { originalname: string }): string | null {
  const ext = extname(file.originalname).toLowerCase();
  return ALLOWED_LOGO_EXT.has(ext) ? ext : null;
}

/** Detecta el tipo real leyendo los primeros bytes del archivo ya escrito. */
function detectStoredImageType(filePath: string): string | null {
  const fd = openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(12);
    const read = readSync(fd, buf, 0, 12, 0);
    if (read < 3) return null;
    if (PNG_SIGNATURE.equals(buf.subarray(0, 4))) return '.png';
    if (JPEG_SIGNATURE.equals(buf.subarray(0, 3))) return '.jpg';
    if (
      read >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      return '.webp';
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

/** Escribe en disco y valida; devuelve el nombre definitivo del logo. */
function finalizeLogo(file: { path: string; filename: string }, companyId: string): string {
  const detected = detectStoredImageType(file.path);
  if (!detected) {
    try {
      unlinkSync(file.path);
    } catch {
      // el resto de la limpieza se hace en removePreviousLogos
    }
    throw new BadRequestException(
      'El archivo no es una imagen válida. Se permiten PNG, JPEG o WebP',
    );
  }
  const finalName = `logo-${safeId(companyId)}${detected}`;
  if (file.filename !== finalName) {
    renameSync(file.path, join(LOGOS_DIR, finalName));
  }
  return finalName;
}

function publicLogoUrl(companyId: string, ext: string): string {
  return `/api/uploads/logo-${safeId(companyId)}${ext}`;
}

function removePreviousLogos(companyId: string, keep: string): void {
  const dir = ensureLogosDir();
  const prefix = `logo-${safeId(companyId)}.`;
  for (const filename of readdirSync(dir)) {
    if (filename.startsWith(prefix) && filename !== keep) {
      try {
        unlinkSync(join(dir, filename));
      } catch {
        // archivo en uso por otro proceso — se ignora
      }
    }
  }
}

/** Configuración Multer compartida para los dos endpoints de logo. */
function logoUploadInterceptor() {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => cb(null, ensureLogosDir()),
      filename: (req, file, cb) => {
        // Nombre temporal: se valida el contenido y se renombra en el controller.
        cb(null, `tmp-${randomUUID()}.img`);
      },
    }),
    limits: { fileSize: MAX_LOGO_BYTES },
    fileFilter: (req, file, cb) => {
      const declaredExt = allowedDeclaredExt(file);
      if (!declaredExt) {
        cb(new BadRequestException('Solo se permiten imágenes PNG, JPEG o WebP'), false);
        return;
      }
      if (file.mimetype && !file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('El tipo MIME del archivo no es una imagen'), false);
        return;
      }
      cb(null, true);
    },
  });
}

@Controller('config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConfigController {
  constructor(
    private service: ConfigService,
    private rbacService: RbacService,
    private modulePlacementsService: ModulePlacementsService,
  ) {}

  private ensureSuperAdmin(user: { profileId: string }): void {
    if (user.profileId !== SUPER_ADMIN_PROFILE_ID) {
      throw new ForbiddenException('Esta operación solo la puede realizar el superadmin');
    }
  }

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = await this.rbacService.getPermissionsByPrefix(user.sub, companyId, 'config');
    return { permissions, featureFlags: {} };
  }

  // --- Empresa propia (config.read / config.update) ---

  @Get()
  @Permissions('config.read')
  findOne(@CurrentTenant() companyId: string) {
    return this.service.findOne(companyId);
  }

  @Patch()
  @Permissions('config.update')
  update(@CurrentTenant() companyId: string, @Body() dto: any) {
    return this.service.update(companyId, dto);
  }

  // --- Logo propia ---

  @Post('logo')
  @Permissions('config.update')
  @UseInterceptors(logoUploadInterceptor())
  uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() companyId: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const finalName = finalizeLogo(file, companyId);
    removePreviousLogos(companyId, finalName);
    return this.service.update(companyId, { logoUrl: publicLogoUrl(companyId, extname(finalName)) });
  }

  // --- Gestión global de empresas (solo superadmin) ---

  @Get('companies')
  @Permissions('config.read')
  findAllCompanies(@CurrentUser() user) {
    this.ensureSuperAdmin(user);
    return this.service.findAllCompanies();
  }

  @Post('companies')
  @Permissions('config.update')
  async createCompany(@CurrentUser() user, @Body() dto: CreateCompanyDto) {
    this.ensureSuperAdmin(user);
    const company = await this.service.create(dto);
    // Los perfiles de sistema de la nueva empresa (admin/vendedor) se crean
    // clonando las plantillas globales; luego cada empresa configura los suyos.
    await this.rbacService.ensureCompanyProfiles(company.id);
    // Los módulos globales se distribuyen automáticamente a la nueva empresa.
    await this.modulePlacementsService.assignGlobalModules(company.id);
    return company;
  }

  @Patch('companies/:id')
  @Permissions('config.update')
  updateCompany(@CurrentUser() user, @Param('id') id: string, @Body() dto: any) {
    this.ensureSuperAdmin(user);
    return this.service.update(id, dto);
  }

  @Post('companies/:id/logo')
  @Permissions('config.update')
  @UseInterceptors(logoUploadInterceptor())
  uploadCompanyLogo(
    @CurrentUser() user,
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
  ) {
    this.ensureSuperAdmin(user);
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const finalName = finalizeLogo(file, id);
    removePreviousLogos(id, finalName);
    return this.service.update(id, { logoUrl: publicLogoUrl(id, extname(finalName)) });
  }
}