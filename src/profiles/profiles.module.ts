import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import CacheService from '@lib/cache';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, CacheService],
})
export class ProfilesModule {}
