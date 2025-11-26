import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  ICreateNewProfile,
  IUpdateProfilePayload,
} from '@dto/profile/profile.dto';
import { BaseService } from '@common/base_service.service';
import { ProfileEntity } from '@entities/profile.entity';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import CacheService from '@lib/cache';
import { UserEntity } from '@entities/user.entity';

@Injectable()
export class ProfilesService extends BaseService {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) req: FastifyRequest,
    private cache: CacheService,
  ) {
    super(dataSource, req);
  }
  async CreateNewProfile(payload: ICreateNewProfile): Promise<ProfileEntity> {
    const profileRepo = this.getRepository(ProfileEntity);

    const create = profileRepo.create({
      ...payload,
    });

    await profileRepo.save(create);

    // Update cache so subsequent reads get fresh data
    const user = await this.CustomQueryWithAppId(UserEntity, {
      table_alias: 'user',
      preload: ['profiles', 'address'],
    })
      .where('user.id = :id', { id: create.user_id })
      .getOneOrFail();

    await this.cache.Set<UserEntity>(
      'user',
      this.AppId,
      user.id.toString(),
      user,
    );

    return create;
  }

  async UpdateProfile(payload: IUpdateProfilePayload): Promise<ProfileEntity> {
    try {
      const profile = await this.CustomQueryParentWithAppId(ProfileEntity, {
        app_id: true,
        parent_table: 'user',
        table_alias: 'profiles',
      })
        .where('profiles.id = :id', { id: payload.id })
        .getOneOrFail();

      const profileRepo = this.getRepository(ProfileEntity);

      // Merge only allowed updatable fields to avoid overwriting unrelated properties
      const { id, ...updatable } = payload as any;
      const merged = profileRepo.merge(profile, updatable);

      const saved = await profileRepo.save(merged);

      // Update cache so subsequent reads get fresh data
      const user = await this.CustomQueryWithAppId(UserEntity, {
        table_alias: 'user',
        preload: ['profiles', 'address'],
      })
        .where('user.id = :id', { id: saved.user_id })
        .getOneOrFail();

      await this.cache.Set<UserEntity>(
        'user',
        this.AppId,
        user.id.toString(),
        user,
      );

      return saved;
    } catch (err) {
      // Handle not found more clearly
      const errName = (err && (err.name || '')).toString();
      if (
        errName === 'EntityNotFound' ||
        errName === 'EntityNotFoundError' ||
        (err &&
          err.message &&
          err.message.toLowerCase().includes('could not find'))
      ) {
        throw new NotFoundException({ message: 'Profile not found' });
      }
      // Log and rethrow a generic internal error
      // eslint-disable-next-line no-console
      console.error('[ProfilesService][UpdateProfile] error:', err);
      throw new InternalServerErrorException({
        message: 'Update profile have error',
      });
    }
  }

  async GetAllProfile(): Promise<ProfileEntity[]> {
    return await this.getRepository(ProfileEntity).find({
      where: {
        user: {
          app_id: this.AppId,
        },
      },
      relations: {
        user: true,
      },
    });
  }

  async GetProfileById(id: number): Promise<ProfileEntity> {
    const profile_cache = await this.cache.Get<ProfileEntity>(
      'profile',
      this.AppId,
      id.toString(),
    );
    if (!profile_cache) {
      const profile = await this.CustomQueryParentWithAppId(ProfileEntity, {
        table_alias: 'profile',
        parent_table: 'users',
        preload: ['user'],
      })
        .where('id = :id', { id: id })
        .getOneOrFail();

      await this.cache.Set<ProfileEntity>(
        'profile',
        this.AppId,
        profile.id.toString(),
        profile,
      );
      return profile;
    } else {
      return profile_cache;
    }
  }

  async DeleteProfileById(id: number): Promise<number> {
    const deleted = await this.getRepository(ProfileEntity).softDelete(id);
    if (!deleted || deleted.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Delete profile have error',
      });
    }

    await this.cache.Delete('profile', this.AppId, id.toString());
    return id;
  }

  async AdvanceFilterProfile(
    query: IAdvanceFilter,
  ): Promise<IResponseAdvanceFilter<ProfileEntity>> {
    const profiles = await this.AdvanceFilter(query, ProfileEntity, {
      app_id: true,
      table_alias: 'profiles',
      // preload: ['user'],
      parent_table: 'user',
    });

    return {
      total_page: Math.ceil(profiles.total / (query.per_page ?? 1)),
      total: profiles.total,
      data: profiles.data,
    };
  }
}
