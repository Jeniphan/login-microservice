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

  private generateKey(table_name: string, app_id: string, key: string): string {
    return `${this._node_env}:${this._key}:${table_name}:${app_id}:${key}`;
  }

  async Get<T>(
    table_name: string,
    app_id: string,
    key: string,
  ): Promise<T | null> {
    const value = await this.cacheManager.get(
      this.generateKey(table_name, app_id, key),
    );
    return value as T | null;
    // if (value) {
    //   return JSON.parse(value as string) as T;
    // } else {
    //   return null;
    // }
  }

  async Set<T>(
    table_name: string,
    app_id: string,
    key: string,
    value: T,
    ttl?: Milliseconds,
  ) {
    await this.cacheManager.set(
      this.generateKey(table_name, app_id, key),
      value,
      ttl,
    );
  }

  async Delete(table_name: string, app_id: string, key: string) {
    const _key = this.generateKey(table_name, app_id, key);
    const cache = this.cacheManager.get(_key);
    if (cache) {
      await this.cacheManager.del(_key);
    }
  }
}
