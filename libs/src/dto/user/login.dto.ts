import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { UserInfo } from '@app/common/dto';

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
  @ApiProperty({
    description: 'JWT 액세스 토큰',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '사용자 정보',
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
