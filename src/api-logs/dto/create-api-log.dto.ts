import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApiLogDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  display_status?: string;

  @IsOptional()
  @IsString()
  target_system?: string;

  @IsOptional()
  @IsString()
  api_config_id?: string;

  @IsOptional()
  @IsString()
  login_id?: string;

  @IsOptional()
  @IsString()
  correlation_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  limit?: number;
}
