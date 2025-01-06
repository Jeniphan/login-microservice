import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { BaseRepository } from '@common/base_service.service';
import {
  AuthLogin,
  ILoginWithProvider,
  ISingInPayload,
} from '@dto/Auth/auth.dto';
import { UserEntity } from '@entities/user.entity';
import * as bcrypt from 'bcrypt';
import { UUIDV4 } from '../helper/uuid.helper';
import { JwtService } from '@nestjs/jwt';
import { ProfileEntity } from '@entities/profile.entity';

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
      .andWhere('users.username = :username', { username: payload.username })
      .andWhere('users.provider = :p', { p: payload.provider })
      .getOne();

    if (!userInfo) {
      //Create user
      const user = new UserEntity();
      user.username = payload.username;
      user.provider = payload.provider;
      user.password = await bcrypt.hash(UUIDV4(), await bcrypt.genSalt());
      user.last_active = new Date();
      user.first_login = true;
      user.deleted_at = null;
      user.app_id = this.AppId;

      await userRepo.save(user);

      if (
        payload.first_name ||
        payload.image ||
        payload.last_name ||
        payload.email
      ) {
        const profileRepo = this.getRepository(ProfileEntity);
        const newProfile = profileRepo.create({
          first_name: payload.first_name ?? null,
          last_name: payload.last_name ?? null,
          email: payload.email ?? null,
          image: payload.image ?? null,
          deleted_at: null,
          national_id: null,
          phone_number: null,
          user: user,
        });

        await profileRepo.save(newProfile);
      }

      userInfo = await this.CustomQueryWithAppId(UserEntity, {
        table_alias: 'users',
        preload: ['profiles'],
      })
        .andWhere('users.username = :username', { username: payload.username })
        .andWhere('users.provider = :p', { p: payload.provider })
        .getOne();
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
      if (
        payload.first_name ||
        payload.image ||
        payload.last_name ||
        payload.email
      ) {
        const profileRepo = this.getRepository(ProfileEntity);

        await profileRepo.upsert(
          {
            id: userInfo.profiles[0].id,
            user_id: userInfo.id,
            first_name: payload.first_name,
            last_name: payload.last_name,
            email: payload.email,
            image: payload.image,
          },
          {
            conflictPaths: {
              first_name: true,
              last_name: true,
              email: true,
              image: true,
            },
            skipUpdateIfNoValuesChanged: true,
          },
        );
      }

      if (!update || update.affected === 0) {
        throw new InternalServerErrorException({
          message: 'Update user have Error',
        });
      }

      userInfo = await this.CustomQueryWithAppId(UserEntity, {
        table_alias: 'users',
        preload: ['profiles'],
      })
        .andWhere('users.username = :username', { username: payload.username })
        .andWhere('users.provider = :p', { p: payload.provider })
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
      .andWhere('username = :username', { username: payload.username })
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
      expiresIn: process.env.TOKEN_EXPIRE ?? '1d',
    });
  }

  private async genTokenRefresh(lastActive: string): Promise<string> {
    const payload = {
      last_active: lastActive,
    };

    return await this.jwtService.signAsync(payload, {
      secret: process.env.SECRET_KEY_REFRESH,
      expiresIn: process.env.TOKEN_REFRESH_EXPIRE ?? '2d',
    });
  }
}
