import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ChatRequestDto {
  @ApiProperty({ example: 'What is the weather in Hong Kong today?' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  lang?: string;
}

export class ChatResponseDto {
  @ApiProperty()
  answer: string;
}
