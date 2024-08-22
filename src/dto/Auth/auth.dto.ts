import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { UserEntity } from '@entities/user.entity';

export class ILoginWithProvider {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  provider: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  image?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  first_name?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  last_name?: string;

  @ApiProperty()
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class ISingInPayload {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export interface AuthLogin {
  access_token: string;
  refresh_token: string;
  user_info: UserEntity;
}
