import { PartialType } from '@nestjs/mapped-types';
import { CreateApiLogDto } from './create-api-log.dto';

export class UpdateApiLogDto extends PartialType(CreateApiLogDto) {}
