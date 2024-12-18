import { Injectable } from '@nestjs/common';
import CacheService from '@lib/cache';

@Injectable()
export class AppService {
  constructor(private cache: CacheService) {}
  async healthCheckService(): Promise<string> {
    let value = await this.cache.Get('test');
    if (!value) {
      await this.cache.Set('test', 'Redis it working!');
      value = await this.cache.Get('test');
    }
    return value as string;
  }
}
