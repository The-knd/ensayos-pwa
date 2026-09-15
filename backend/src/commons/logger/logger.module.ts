import { Global, Module } from '@nestjs/common';
import { StructuredLogger } from './structured-logger.service';

@Global()
@Module({
  providers: [StructuredLogger],
  exports: [StructuredLogger],
})
export class LoggerModule {}