import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { BaseService } from '@common/base_service.service';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import {
  ICreateNewAddress,
  IUpdateAddressPayload,
} from '@dto/address/address.dto';
import { AddressEntity } from '@entities/address.entity';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';
import { UserEntity } from '@entities/user.entity';
import CacheService from '@lib/cache';

@Injectable()
export class AddressService extends BaseService {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) req: FastifyRequest,
    private cache: CacheService,
  ) {
    super(dataSource, req);
  }

  async CreateNewAddress(payload: ICreateNewAddress): Promise<AddressEntity> {
    const addressRepo = this.getRepository(AddressEntity);

    const create = addressRepo.create({
      ...payload,
    });

    await addressRepo.save(create);

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

  async UpdateAddress(payload: IUpdateAddressPayload): Promise<AddressEntity> {
    const address = await this.CustomQueryParentWithAppId(AddressEntity, {
      app_id: true,
      parent_table: 'user',
      table_alias: 'address',
    })
      .where('address.id = :id', { id: payload.id })
      .getOneOrFail();

    const profileRepo = this.getRepository(AddressEntity);

    // Merge only allowed updatable fields to avoid overwriting unrelated properties
    const { id, ...updatable } = payload as any;
    const merged = profileRepo.merge(address, updatable);

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

    return this.GetAddressById(payload.id);
  }

  async GetAllAddress(): Promise<AddressEntity[]> {
    return await this.getRepository(AddressEntity).find({
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

  async GetAddressById(id: number): Promise<AddressEntity> {
    return await this.getRepository(AddressEntity).findOneOrFail({
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

  async DeletedAddressById(id: number): Promise<number> {
    const deleted = await this.getRepository(AddressEntity).softDelete(id);
    if (!deleted || deleted.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Delete Address have Error',
      });
    }

    return id;
  }

  async AdvanceFilterAddress(
    query: IAdvanceFilter,
  ): Promise<IResponseAdvanceFilter<AddressEntity>> {
    const profiles = await this.AdvanceFilter(query, AddressEntity, {
      app_id: true,
      table_alias: 'address',
      parent_table: 'user',
    });

    return {
      total_page: Math.ceil(profiles.total / (query.per_page ?? 1)),
      total: profiles.total,
      data: profiles.data,
    };
  }
}
