import { PartialType } from '@nestjs/mapped-types';
import { CreateFtpDto } from './create-ftp.dto';

export class UpdateFtpDto extends PartialType(CreateFtpDto) {}
