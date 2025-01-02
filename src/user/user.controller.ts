import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import ApiResponse from '@lib/http-response';
import { FastifyReply, FastifyRequest } from 'fastify';
import { UserService } from './user.service';
import { ICreateUserPayload, IUpdateUserPayload } from '@dto/user/user.dto';
import { IAdvanceFilter } from '@dto/base.dto';

@Controller('user')
@ApiTags('User')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post()
  async CreateNewUser(
    @Res() res: FastifyReply,
    @Body() payload: ICreateUserPayload,
  ) {
    try {
      const result = await this.userService.CreateNewUserService(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Put()
  async UpdateUser(
    @Res() res: FastifyReply,
    @Body() payload: IUpdateUserPayload,
  ) {
    try {
      const result = await this.userService.UpdateUserById(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Get()
  async GetAllUser(@Res() res: FastifyReply, @Req() req: FastifyRequest) {
    try {
      const result = await this.userService.GetAllUser();
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Get('/show')
  @ApiProperty({ name: 'id', type: 'number' })
  async GetUserById(@Res() res: FastifyReply, @Query('id') id: number) {
    try {
      const result = await this.userService.GetUserById(id);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Delete()
  @ApiProperty({ name: 'id', type: 'number' })
  async DeleteUserById(@Res() res: FastifyReply, @Query('id') id: number) {
    try {
      const result = await this.userService.DeleteUserById(id);
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
      const result = await this.userService.AdvanceFilterUser(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }
}
