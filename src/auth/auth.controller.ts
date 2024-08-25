import { Body, Controller, Post, Res, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ILoginWithProvider, ISingInPayload } from '@dto/Auth/auth.dto';
import { FastifyReply } from 'fastify';
import ApiResponse from '@lib/http-response';
import { TransactionInterceptor } from '../common/transaction.interceptor';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/login-provider')
  @ApiBearerAuth()
  @UseInterceptors(TransactionInterceptor)
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
  @UseInterceptors(TransactionInterceptor)
  async SignIn(@Body() payload: ISingInPayload, @Res() res: FastifyReply) {
    try {
      const result = await this.authService.SignIn(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }
}
