import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialsCipher } from '../../../commons/crypto/credentials.cipher';
import { ConnectionPluginsRegistry } from './connection-plugins';
import { ConnectionsAdminController } from './connections-admin.controller';
import { ConnectionsService } from './connections.service';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationHttpClient } from './http/integration-http.client';

/**
 * Conexiones de una empresa con sistemas externos (URL, credenciales cifradas,
 * ajustes) y su administración por el superadmin.
 *
 * No conoce ningún sistema concreto ni el vocabulario de clientes: expone el
 * puerto `ConnectionPlugin` (ConnectionPluginsRegistry) para validar y probar.
 * `IntegrationHttpClient` se exporta para que los adaptadores (p. ej. SAP)
 * hablen con su sistema reutilizando proxy/timeout/errores.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationConnection])],
  controllers: [ConnectionsAdminController],
  providers: [ConnectionsService, ConnectionPluginsRegistry, IntegrationHttpClient, CredentialsCipher],
  exports: [ConnectionsService, ConnectionPluginsRegistry, IntegrationHttpClient],
})
export class ConnectionsModule {}
