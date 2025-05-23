import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SignUpResponseDto {
  @Expose()
  @ApiProperty({
    description: '등록된 사용자의 고유 ID',
    example: '01HT5MDZWN8A1PTB6DKKV56GHM',
  })
  userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }
}
