import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import CacheService from '@lib/cache';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [UserController],
  providers: [UserService, CacheService],
})
export class UserModule {}
