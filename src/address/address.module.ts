import { Module } from '@nestjs/common';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import CacheService from '@lib/cache';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [AddressController],
  providers: [AddressService, CacheService],
})
export class AddressModule {}
