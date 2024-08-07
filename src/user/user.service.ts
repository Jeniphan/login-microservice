import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { BaseRepository } from '../common/base_service.service';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { ICreateUserPayload, IUpdateUserPayload } from '@dto/user/user.dto';
import { UserEntity } from '@entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService extends BaseRepository {
  constructor(dataSource: DataSource, @Inject(REQUEST) req: FastifyRequest) {
    super(dataSource, req);
  }

  async CreateNewUserService(payload: ICreateUserPayload): Promise<UserEntity> {
    //Check username is existed
    const user = await this.CustomQueryWithAppId(UserEntity)
      .where('username = :username', { username: payload.username })
      .getOne();

    if (user) {
      throw new InternalServerErrorException({
        message: 'This username is existed',
      });
    }

    //Create new user
    const userRepo = this.getRepository(UserEntity);
    const createUser = userRepo.create({
      app_id: this.AppId,
      username: payload.username,
      password: await bcrypt.hash(payload.password, 10),
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
    const user = await this.CustomQueryWithAppId(UserEntity)
      .where('id = :id', {
        id: payload.id,
      })
      .getOneOrFail();

    const update = await userRepo.update(payload.id, {
      ...payload,
    });

    if (update.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Update User is Error',
      });
    }

    return user;
  }
}
