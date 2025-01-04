import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Scope,
} from '@nestjs/common';
import { BaseRepository } from '../common/base_service.service';
import { DataSource } from 'typeorm';
import { ICreateUserPayload, IUpdateUserPayload } from '@dto/user/user.dto';
import { UserEntity } from '@entities/user.entity';
import * as bcrypt from 'bcrypt';
import { IAdvanceFilter, IResponseAdvanceFilter } from '@dto/base.dto';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import CacheService from '@lib/cache';

@Injectable({ scope: Scope.REQUEST })
export class UserService extends BaseRepository {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) request: FastifyRequest,
    private cache: CacheService,
  ) {
    super(dataSource, request);
  }

  async CreateNewUserService(payload: ICreateUserPayload): Promise<UserEntity> {
    //Check username is existed
    const user = await this.CustomQueryWithAppId(UserEntity)
      .andWhere('username = :username', { username: payload.username })
      .getOne();

    if (user) {
      throw new InternalServerErrorException({
        message: 'This username is existed',
      });
    }

    //Create new user
    const salt = await bcrypt.genSalt(10);
    const userRepo = this.getRepository(UserEntity);
    const createUser = userRepo.create({
      app_id: this.AppId,
      username: payload.username,
      password: await bcrypt.hash(payload.password, salt),
      provider: 'credentials',
      last_active: new Date(),
      first_login: true,
      deleted_at: null,
    });

    await userRepo.save(createUser);

    return createUser;
  }

  async UpdateUserById(payload: IUpdateUserPayload): Promise<UserEntity> {
    const userRepo = this.getRepository(UserEntity);
    await this.CustomQueryWithAppId(UserEntity)
      .where('id = :id', {
        id: payload.id,
      })
      .getOneOrFail();

    if (payload.password) {
      const salt = await bcrypt.genSalt(10);
      payload.password = await bcrypt.hash(payload.password, salt);
    }

    const update = await userRepo.update(payload.id, {
      ...payload,
    });

    if (update.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Update User is Error',
      });
    }

    const newUser = await this.CustomQueryWithAppId(UserEntity)
      .where('id = :id', {
        id: payload.id,
      })
      .getOneOrFail();

    await this.cache.Set('user', this.AppId, payload.id.toString(), newUser);

    return newUser;
  }

  async GetAllUser(): Promise<UserEntity[]> {
    return await this.CustomQueryWithAppId(UserEntity, {
      table_alias: 'user',
      preload: ['profiles', 'address'],
    }).getMany();
  }

  async GetUserById(Id: number): Promise<UserEntity> {
    const userCache = await this.cache.Get<UserEntity>(
      'user',
      this.AppId,
      Id.toString(),
    );
    if (!userCache) {
      const user = await this.CustomQueryWithAppId(UserEntity, {
        table_alias: 'user',
        preload: ['profiles', 'address'],
      })
        .where('user.id = :id', { id: Id })
        .getOneOrFail();
      await this.cache.Set<UserEntity>(
        'user',
        this.AppId,
        user.id.toString(),
        user,
      );
      return user;
    } else {
      return userCache;
    }
  }

  async DeleteUserById(id: number): Promise<number> {
    await this.getRepository(UserEntity).softDelete(id);
    await this.cache.Delete('user', this.AppId, id.toString());
    return id;
  }

  async AdvanceFilterUser(
    query: IAdvanceFilter,
  ): Promise<IResponseAdvanceFilter<UserEntity>> {
    const user = await this.AdvanceFilter(query, UserEntity, {
      app_id: true,
      table_alias: 'user',
      preload: ['profiles', 'address'],
    });

    return {
      total_page: Math.ceil(user.total / query.per_page),
      total: user.total,
      data: user.data,
    };
  }
}
