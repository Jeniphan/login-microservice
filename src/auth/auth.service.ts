import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { BaseRepository } from '../common/base_service.service';
import {
  AuthLogin,
  ILoginWithProvider,
  ISingInPayload,
} from '@dto/Auth/auth.dto';
import { UserEntity } from '@entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UUIDV4 } from '../helper/uuid.helper';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService extends BaseRepository {
  constructor(
    dataSource: DataSource,
    @Inject(REQUEST) req: FastifyRequest,
    private jwtService: JwtService,
  ) {
    super(dataSource, req);
  }

  async LoginWithProvider(payload: ILoginWithProvider): Promise<AuthLogin> {
    const userRepo = this.getRepository(UserEntity);
    let userInfo = await this.CustomQueryWithAppId(UserEntity, {
      table_alias: 'users',
      preload: ['profiles'],
    })
      .where('users.username = :username', { username: payload.username })
      .where('users.provider = :p', { p: payload.provider })
      .getOne();

    if (!userInfo) {
      //Create user
      const create = userRepo.create({
        username: payload.username,
        provider: payload.provider,
        password: await bcrypt.hash(UUIDV4(), await bcrypt.genSalt()),
        last_active: new Date(),
        first_login: true,
        deleted_at: null,
        app_id: this.AppId,
        profiles: [
          {
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            image: payload.image,
          },
        ],
      });
      await userRepo.save(create);

      userInfo = create;
    } else {
      //Update last active
      const update = await userRepo.update(
        {
          id: userInfo.id,
        },
        {
          last_active: new Date(),
          first_login: false,
        },
      );

      if (!update || update.affected === 0) {
        throw new InternalServerErrorException({
          message: 'Update user have Error',
        });
      }

      userInfo = await this.CustomQueryWithAppId(UserEntity, {
        table_alias: 'users',
        preload: ['profiles'],
      })
        .where('users.username = :username', { username: payload.username })
        .where('users.provider = :p', { p: payload.provider })
        .getOne();
    }

    return {
      access_token: await this.genToken(userInfo),
      refresh_token: await this.genTokenRefresh(new Date().toISOString()),
      user_info: {
        ...userInfo,
        password: '',
      },
    };
  }

  async SignIn(payload: ISingInPayload): Promise<AuthLogin> {
    const userInfo = await this.CustomQueryWithAppId(UserEntity)
      .where('username = :username', { username: payload.username })
      .getOneOrFail();

    //Check password
    const isPassword = bcrypt.compareSync(payload.password, userInfo.password);
    if (!isPassword) {
      throw new UnauthorizedException({ message: 'Login Fail' });
    }

    //Update last active
    const update = await this.getRepository(UserEntity).update(
      {
        id: userInfo.id,
      },
      {
        last_active: new Date(),
      },
    );
    if (!update || update.affected === 0) {
      throw new InternalServerErrorException({
        message: 'Update user have Error',
      });
    }

    return {
      access_token: await this.genToken(userInfo),
      refresh_token: await this.genTokenRefresh(new Date().toISOString()),
      user_info: {
        ...userInfo,
        password: '',
      },
    };
  }

  private async genToken(userInfo: UserEntity): Promise<string> {
    console.log(userInfo);
    const payload = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.profiles[0]?.email ?? '',
      image: userInfo.profiles[0]?.image ?? '',
      first_name: userInfo.profiles[0]?.first_name ?? '',
      last_name: userInfo.profiles[0]?.last_name ?? '',
      phone_number: userInfo.profiles[0]?.phone_number ?? '',
      first_login: userInfo.first_login,
      last_active: userInfo.last_active,
    };

    return await this.jwtService.signAsync(payload, {
      secret: process.env.SECRET_KEY,
      expiresIn: '1d',
    });
  }

  private async genTokenRefresh(lastActive: string): Promise<string> {
    const payload = {
      last_active: lastActive,
    };

    return await this.jwtService.signAsync(payload, {
      secret: process.env.SECRET_KEY_REFRESH,
      expiresIn: '2d',
    });
  }
}
