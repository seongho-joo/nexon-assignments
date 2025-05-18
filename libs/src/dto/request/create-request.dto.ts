import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject, IsOptional } from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({
    description: '이벤트 ID',
    example: '01H1VXCR1MPXQJ5MQGZ04FPDYN',
  })
  @IsString()
  @IsNotEmpty()
  eventId: string;
}
