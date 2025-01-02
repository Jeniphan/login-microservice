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
import { FastifyReply } from 'fastify';
import ApiResponse from '@lib/http-response';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IAdvanceFilter } from '@dto/base.dto';
import { AddressService } from './address.service';
import {
  ICreateNewAddress,
  IUpdateAddressPayload,
} from '@dto/address/address.dto';

@Controller('address')
@ApiTags('Address')
@ApiBearerAuth()
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  async CreateNewAddress(
    @Res() res: FastifyReply,
    @Body() payload: ICreateNewAddress,
  ) {
    try {
      const result = await this.addressService.CreateNewAddress(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Put()
  async UpdateAddress(
    @Res() res: FastifyReply,
    @Body() payload: IUpdateAddressPayload,
  ) {
    try {
      const result = await this.addressService.UpdateAddress(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Get()
  async GetAllAddress(@Res() res: FastifyReply) {
    try {
      const result = await this.addressService.GetAllAddress();
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Get('/show')
  @ApiProperty({ name: 'id', type: 'number' })
  async GetAddressById(@Res() res: FastifyReply, @Query('id') id: number) {
    try {
      const result = await this.addressService.GetAddressById(id);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }

  @Delete()
  @ApiProperty({ name: 'id', type: 'number' })
  async DeleteAddressById(@Res() res: FastifyReply, @Query('id') id: number) {
    try {
      const result = await this.addressService.DeletedAddressById(id);
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
      const result = await this.addressService.AdvanceFilterAddress(payload);
      return new ApiResponse(res).handle(result);
    } catch (err) {
      return new ApiResponse(res).error(err);
    }
  }
}
