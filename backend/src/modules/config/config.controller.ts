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
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../../commons/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../commons/guards/permissions.guard';
import { Permissions } from '../../commons/decorators/permissions.decorator';
import { CurrentTenant } from '../../commons/decorators/current-tenant.decorator';
import { CurrentUser } from '../../commons/decorators/current-user.decorator';
import { ConfigService } from './config.service';
import { RbacService } from '../rbac/rbac.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

function ensureUploadsDir(): string {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
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
        destination: (req, file, cb) => cb(null, ensureUploadsDir()),
        filename: (req, file, cb) => {
          const companyId = (req as any).user?.companyId || 'unknown';
          const ext = extname(file.originalname) || '.png';
          cb(null, `logo-${companyId}${ext}`);
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
    const logoUrl = `/uploads/logo-${companyId}${extname(file.originalname) || '.png'}`;
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
        destination: (req, file, cb) => cb(null, ensureUploadsDir()),
        filename: (req, file, cb) => {
          const id = req.params.id || 'unknown';
          const ext = extname(file.originalname) || '.png';
          cb(null, `logo-${id}${ext}`);
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
    const logoUrl = `/uploads/logo-${id}${extname(file.originalname) || '.png'}`;
    return this.service.update(id, { logoUrl });
  }
}