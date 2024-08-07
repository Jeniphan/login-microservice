import { Body, Controller, Post, Put, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import ApiResponse from '@lib/http-response';
import { FastifyReply } from 'fastify';
import { UserService } from './user.service';
import { ICreateUserPayload, IUpdateUserPayload } from '@dto/user/user.dto';

@Controller('user')
@ApiTags('User')
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
}
