import { IsNotEmpty, IsString } from 'class-validator';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;
} 