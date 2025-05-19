import { IsString } from 'class-validator';
import { Expose } from 'class-transformer';

export class LogoutRequestDto {
  @IsString()
  userId: string;
}

export class LogoutResponseDto {
  @Expose()
  success: boolean;

  @Expose()
  message?: string;

  @Expose()
  playTimeMinutes?: number;
} 