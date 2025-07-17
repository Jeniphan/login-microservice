import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ICreateNewProfile,
  IUpdateProfilePayload,
} from '@dto/profile/profile.dto';
import { BaseRepository } from '@common/base_service.service';
import { ProfileEntity } from '@entities/profile.entity';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import CacheService from '@lib/cache';

@Injectable()
export class ProfilesService extends BaseRepository {
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
    return create;
  }

  async UpdateProfile(payload: IUpdateProfilePayload): Promise<ProfileEntity> {
    const profile = await this.CustomQueryWithAppId(ProfileEntity)
      .where('id = :id', { id: payload.id })
      .getOneOrFail();

    const ProfileRepo = this.getRepository(ProfileEntity);

    const update = await ProfileRepo.update(
      {
        id: payload.id,
      },
      { ...payload },
    );

    if (!update || update.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Update profile have Error',
      });
    }

    return profile;
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
      table_alias: 'profiles',
      preload: ['user'],
      with_parent_app_id: true,
      parent_table: 'user',
    });

    return {
      total_page: Math.ceil(profiles.total / (query.per_page ?? 1)),
      total: profiles.total,
      data: profiles.data,
    };
  }
}
