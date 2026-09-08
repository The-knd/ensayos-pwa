import {
  BadRequestException,
  Body,
  Controller,
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
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { ConfigService } from './config.service';
import { RbacService } from '../rbac/rbac.service';

const LOGOS_DIR = join(process.cwd(), 'uploads', 'logos');

function ensureLogosDir(): string {
  if (!existsSync(LOGOS_DIR)) mkdirSync(LOGOS_DIR, { recursive: true });
  return LOGOS_DIR;
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

function safeExt(file: Express.Multer.File): string {
  const ext = extname(file.originalname).toLowerCase();
  const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
  return allowed.includes(ext) ? ext : '.png';
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

@Controller('config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ConfigController {
  constructor(
    private service: ConfigService,
    private rbacService: RbacService,
  ) {}

  @Get('context')
  async getContext(@CurrentUser() user, @CurrentTenant() companyId: string) {
    const permissions = (await this.rbacService.getPermissions(user.sub, companyId)).filter(
      (p) => p.startsWith('config.'),
    );
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
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, ensureLogosDir()),
        filename: (req, file, cb) => {
          const companyId = (req as any).user?.companyId || 'unknown';
          cb(null, `logo-${safeId(companyId)}${safeExt(file)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() companyId: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const logoUrl = publicLogoUrl(companyId, safeExt(file));
    removePreviousLogos(companyId, `logo-${safeId(companyId)}${safeExt(file)}`);
    return this.service.update(companyId, { logoUrl });
  }

  // --- Gestión de todas las empresas (solo config.update = super admin) ---

  @Get('companies')
  @Permissions('config.read')
  findAllCompanies() {
    return this.service.findAllCompanies();
  }

  @Patch('companies/:id')
  @Permissions('config.update')
  updateCompany(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Post('companies/:id/logo')
  @Permissions('config.update')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => cb(null, ensureLogosDir()),
        filename: (req, file, cb) => {
          cb(null, `logo-${safeId(req.params.id || 'unknown')}${safeExt(file)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadCompanyLogo(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
  ) {
    if (!file) throw new BadRequestException('No se recibió ningún archivo');
    const logoUrl = publicLogoUrl(id, safeExt(file));
    removePreviousLogos(id, `logo-${safeId(id)}${safeExt(file)}`);
    return this.service.update(id, { logoUrl });
  }
}