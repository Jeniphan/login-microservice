import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { HttpClientService, MessageResultAPI } from '@lib/http_client.service';
import * as process from 'node:process';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class ApplicationGuard implements CanActivate {
  private readonly httpClient: HttpClientService;
  private readonly jwtService: JwtService;
  private readonly logger: Logger;
  constructor() {
    this.httpClient = new HttpClientService();
    this.jwtService = new JwtService();
    this.logger = new Logger();
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (process.env.NODE_ENV === 'develop') {
      request.headers['app_id'] = '2de96516-8e1e-4258-b48e-f6e5056ded81';
      return true;
    }

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      // 💡 We're assigning the payload to the request object here
      // so that we can access it in our route handlers
      this.logger.log({
        baseURL: process.env.ENDPOINT_APPLICATION_MS,
        method: process.env.METHOD_APPLICATION_VERIFY,
        url: process.env.URL_APPLICATION_VERIFY,
        data: {
          token: token,
        },
      });
      const verifyToken: MessageResultAPI<string> =
        await this.httpClient.CallApi({
          baseURL: process.env.ENDPOINT_APPLICATION_MS,
          method: process.env.METHOD_APPLICATION_VERIFY,
          url: process.env.URL_APPLICATION_VERIFY,
          data: {
            token: token,
          },
        });

      if (!verifyToken || verifyToken.status !== 200) {
        this.logger.error(verifyToken);
        this.handleError('Verify Token have error!!');
      }
      request.headers['app_id'] = verifyToken.result;
      return true;
    } catch (err) {
      this.handleError(err);
    }
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private handleError(message?: string) {
    throw new UnauthorizedException({
      message: message,
    });
  }
}
