import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { FastifyReply } from 'fastify';
import ApiResponse from '@lib/http-response';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IAdvanceFilter } from '@dto/base.dto';
import {
  ICreateNewProfile,
  IUpdateProfilePayload,
} from '@dto/profile/profile.dto';

@Controller('profiles')
@ApiTags('Profile')
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profileService: ProfilesService) {}

  @Post()
  async CreateNewProfile(
    @Res() res: FastifyReply,
    @Body() payload: ICreateNewProfile,
  ) {
    try {
      const result = await this.profileService.CreateNewProfile(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Put()
  async UpdateUser(
    @Res() res: FastifyReply,
    @Body() payload: IUpdateProfilePayload,
  ) {
    try {
      const result = await this.profileService.UpdateProfile(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Get()
  async GetAllProfile(@Res() res: FastifyReply) {
    try {
      const result = await this.profileService.GetAllProfile();
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Get('/show')
  @ApiProperty({ name: 'id', type: 'number' })
  async GetProfileById(@Res() res: FastifyReply, @Query('id') id: number) {
    try {
      const result = await this.profileService.GetProfileById(id);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Delete()
  @ApiProperty({ name: 'id', type: 'number' })
  async DeleteUserById(@Res() res: FastifyReply, @Query('id') id: number) {
    try {
      const result = await this.profileService.DeleteProfileById(id);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Post('/advance-filter')
  async AdvanceFilterUser(
    @Res() res: FastifyReply,
    @Body() payload: IAdvanceFilter,
  ) {
    try {
      const result = await this.profileService.AdvanceFilterProfile(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }
}
