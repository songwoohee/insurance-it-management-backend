import { IsOptional, IsString } from 'class-validator';

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
}
