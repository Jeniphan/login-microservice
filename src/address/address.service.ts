import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { BaseRepository } from '../common/base_service.service';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import {
  ICreateNewAddress,
  IUpdateAddressPayload,
} from '@dto/address/address.dto';
import { AddressEntity } from '@entities/address.entity';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';

@Injectable()
export class AddressService extends BaseRepository {
  constructor(dataSource: DataSource, @Inject(REQUEST) req: FastifyRequest) {
    super(dataSource, req);
  }

  async CreateNewAddress(payload: ICreateNewAddress): Promise<AddressEntity> {
    const addressRepo = this.getRepository(AddressEntity);

    const create = addressRepo.create({
      ...payload,
    });

    await addressRepo.save(create);

    return create;
  }

  async UpdateAddress(payload: IUpdateAddressPayload): Promise<AddressEntity> {
    const update = await this.getRepository(AddressEntity).update(
      { id: payload.id },
      {
        ...payload,
      },
    );

    if (update.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Update address have Error',
      });
    }

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
