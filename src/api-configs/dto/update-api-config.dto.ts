import { PartialType } from '@nestjs/mapped-types';
import { CreateApiConfigDto } from './create-api-config.dto';

export class UpdateApiConfigDto extends PartialType(CreateApiConfigDto) {}
