import { IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class IResponseAdvanceFilter<T> {
  total: number;
  total_page: number;
  data: T[];
}

export class IAdvanceFilter {
  @ApiProperty({
    type: () => String,
    isArray: true,
  })
  filter_by?: string[];

  @ApiProperty({
    enum: ['and', 'or'],
    default: 'and',
  })
  filter_condition?: 'and' | 'or' = 'and';

  @ApiProperty({
    isArray: true,
    example: [['example']],
  })
  filter?: string[][];

  @ApiProperty({
    type: () => String,
    isArray: true,
  })
  filter_nested_by?: string[];

  @ApiProperty({
    enum: ['and', 'or'],
  })
  filter_nested_condition?: 'and' | 'or' = 'and';

  @ApiProperty({
    isArray: true,
    example: [['example']],
  })
  filter_nested?: string[][];

  @ApiProperty({
    isArray: true,
    type: () => String,
  })
  filter_nested_parent_by?: string[];

  @ApiProperty({
    enum: ['and', 'or'],
  })
  filter_nested_parent_condition?: 'and' | 'or' = 'and';

  @ApiProperty({
    isArray: true,
    example: [['example']],
  })
  filter_nested_parent?: string[][];

  @ApiProperty({
    isArray: true,
    type: () => String,
  })
  search_by?: string[];

  @ApiProperty()
  search?: string;

  @ApiProperty()
  start_by?: string;

  @ApiProperty()
  start?: string;

  @ApiProperty()
  end_by?: string;

  @ApiProperty()
  end?: string;

  @ApiProperty({
    enum: ['and', 'or'],
  })
  start_and_end_condition?: 'and' | 'or' = 'and';

  @ApiProperty({
    type: () => String,
    isArray: true,
  })
  sort_by?: string[];

  @ApiProperty({
    enum: ['desc', 'asc'],
    default: 'asc',
  })
  sort?: ('desc' | 'asc')[];

  @ApiProperty()
  page?: number;

  @ApiProperty()
  per_page?: number;

  @ApiProperty({
    type: () => String,
    isArray: true,
  })
  group_by?: string[];

  @ApiProperty()
  group_sort_by?: string;

  @ApiProperty({
    enum: ['max', 'min'],
  })
  group_sort?: 'max' | 'min';

  @ApiProperty()
  limit?: number;

  @ApiProperty({
    type: () => String,
    isArray: true,
  })
  preload?: string[];
}

export interface IOptionCustomQuery {
  table_alias?: string;
  preload?: string[];
  user_id_alias?: string;
  parent_table?: string;
  nested_table?: string;
  app_id?: boolean;
  with_parent_app_id?: boolean;

  [Key: string]: any;
}

export class IGetShow {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  id: number;
}

export class IDeleteByIds {
  @ApiProperty({
    type: () => Number,
    isArray: true,
  })
  @IsArray()
  @Type(() => Number)
  ids: number[];
}