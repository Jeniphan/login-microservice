import { Inject, Injectable } from '@nestjs/common';
import { Cache, Milliseconds } from 'cache-manager';

@Injectable()
export default class CacheService {
  private readonly _key: string;
  private readonly _node_env: string;
  constructor(@Inject('CACHE_INSTANCE') private cacheManager: Cache) {
    this._key = process.env.REDIS_DEFAULT_KEY;
    this._node_env = process.env.NODE_ENV;
  }

  async Get(key: string): Promise<string | null> {
    return await this.cacheManager.get(`${this._node_env}:${this._key}:${key}`);
  }

  async Set(key: string, value: any, ttl?: Milliseconds) {
    await this.cacheManager.set(
      `${this._node_env}:${this._key}:${key}`,
      value,
      ttl,
    );
  }
}
