import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  async healthCheckService(): Promise<string> {
    return 'GoodBye world';
  }
}
