import { IsString } from 'class-validator';

export class LogoutRequestDto {
  @IsString()
  userId: string;
}

export class LogoutResponseDto {
  success: boolean;
  message?: string;
  playTimeMinutes?: number;
} 