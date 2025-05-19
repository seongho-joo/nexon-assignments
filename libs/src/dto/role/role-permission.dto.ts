import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@app/common/schemas';

export class SetRolePermissionDto {
  @ApiProperty({
    description: '권한을 설정할 역할',
    enum: UserRole,
    example: UserRole.OPERATOR,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    description: 'HTTP 메소드',
    example: 'GET',
  })
  @IsString()
  method: string;

  @ApiProperty({
    description: 'API 경로',
    example: '/api/events',
  })
  @IsString()
  path: string;

  @ApiProperty({
    description: '권한 허용 여부',
    example: true,
  })
  @IsBoolean()
  allow: boolean;
}

export class GetRolePermissionsDto {
  @ApiProperty({
    description: '권한을 조회할 역할',
    enum: UserRole,
    example: UserRole.OPERATOR,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    description: 'HTTP 메소드 (선택적)',
    example: 'GET',
    required: false,
  })
  @IsOptional()
  @IsString()
  method?: string;
}

export class RolePermissionsResponseDto {
  // HTTP 메소드별 허용된 API 경로 목록
  // Example:
  // {
  //   GET: ['/api/events', '/api/rewards'],
  //   POST: ['/api/events']
  // }
  [method: string]: string[];
}
