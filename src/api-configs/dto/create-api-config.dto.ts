import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class CreateApiConfigDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  target_system!: string;

  @IsString()
  @IsNotEmpty()
  protocol!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsString()
  @IsOptional()
  method?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  request_payload?: any;
}
