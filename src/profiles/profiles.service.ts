import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ICreateNewProfile,
  IUpdateProfilePayload,
} from '@dto/profile/profile.dto';
import { BaseRepository } from '../common/base_service.service';
import { ProfileEntity } from '@entities/profile.entity';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';

@Injectable()
export class ProfilesService extends BaseRepository {
  constructor(dataSource: DataSource, @Inject(REQUEST) req: FastifyRequest) {
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
    return await this.getRepository(ProfileEntity).findOneOrFail({
      where: {
        user: {
          app_id: this.AppId,
        },
        id: id,
      },
      relations: {
        user: true,
      },
    });
  }

  async DeleteProfileById(id: number): Promise<number> {
    const deleted = await this.getRepository(ProfileEntity).softDelete(id);
    if (!deleted || deleted.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Delete profile have error',
      });
    }
    return id;
  }

  async AdvanceFilterProfile(
    query: IAdvanceFilter,
  ): Promise<IResponseAdvanceFilter<ProfileEntity>> {
    const profiles = await this.AdvanceFilter(query, ProfileEntity, {
      app_id: true,
      table_alias: 'profiles',
      preload: ['user'],
    });

    return {
      total_page: Math.ceil(profiles.total / (query.per_page ?? 1)),
      total: profiles.total,
      data: profiles.data,
    };
  }
}
