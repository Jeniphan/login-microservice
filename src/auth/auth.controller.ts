import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ILoginWithProvider, ISingInPayload } from '@dto/Auth/auth.dto';
import { FastifyReply } from 'fastify';
import ApiResponse from '@lib/http-response';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login-provider')
  async SignInWithProvider(
    @Body() payload: ILoginWithProvider,
    @Res() res: FastifyReply,
  ) {
    try {
      const result = await this.authService.LoginWithProvider(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Post('/login')
  async SignIn(@Body() payload: ISingInPayload, @Res() res: FastifyReply) {
    try {
      const result = await this.authService.SignIn(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }
}
