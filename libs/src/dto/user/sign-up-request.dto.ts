import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@app/common/schemas';

export class SignUpQueryDto {
  @ApiPropertyOptional({
    description: '관리자 계정 생성을 위한 키',
    example: 'SECRET_ADMIN_KEY',
  })
  @IsOptional()
  @IsString()
  adminKey?: string;
}

export class SignUpRequestDto {
  @ApiProperty({
    description: '사용자 로그인 아이디',
    example: 'user123',
  })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({
    description: '사용자 비밀번호',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: '역할 - ADMIN 같은 경우 adminKey 필요',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsOptional()
  @IsString()
  role?: UserRole;
}
