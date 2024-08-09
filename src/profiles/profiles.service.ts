import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  ICreateNewProfile,
  IUpdateProfilePayload,
} from '@dto/profile/profile.dto';
import { BaseRepository } from '../common/base_service.service';
import { ProfileEntity } from '@entities/profile.entity';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';

@Injectable()
export class ProfilesService extends BaseRepository {
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
    return await this.CustomQueryWithAppId(ProfileEntity, {
      table_alias: 'profiles',
      preload: ['user'],
    }).getMany();
  }

  async GetProfileById(id: number): Promise<ProfileEntity> {
    return await this.CustomQueryWithAppId(ProfileEntity, {
      table_alias: 'profiles',
      preload: ['user'],
    })
      .where('profiles.id = :id', { id: id })
      .getOneOrFail();
  }

  async DeleteProfileById(id: number): Promise<number> {
    const deleted = await this.CustomQueryWithAppId(ProfileEntity)
      .softDelete()
      .where('id = :id', { id: id })
      .execute();
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
