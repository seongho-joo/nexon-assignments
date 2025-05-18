import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserRole } from '@app/common/schemas';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: '사용자 ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: '새로운 역할',
    enum: UserRole,
    example: UserRole.AUDITOR,
  })
  @IsEnum(UserRole)
  @IsNotEmpty()
  newRole: UserRole;
}
