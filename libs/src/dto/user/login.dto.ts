import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Expose, Type } from 'class-transformer';
import { UserInfo } from '@app/common/dto/user';

export class LoginRequestDto {
  @ApiProperty({
    description: '사용자 아이디',
    example: 'john.doe',
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
  password: string;
}

export class LoginResponseDto {
  @Expose()
  @ApiProperty({
    description: 'JWT 액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @Expose()
  @Type(() => UserInfo)
  @ApiProperty({
    description: '사용자 정보',
    type: () => UserInfo,
    example: {
      id: '507f1f77bcf86cd799439011',
      username: 'john.doe',
      role: 'USER',
    },
  })
  user: UserInfo;

  constructor(accessToken: string, user: UserInfo) {
    this.accessToken = accessToken;
    this.user = user;
  }
}
