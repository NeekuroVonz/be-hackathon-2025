import { ApiProperty } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({ example: 'What should I do if flooding happens tonight?' })
  message: string;

  @ApiProperty({ example: 'vi', required: false })
  lang?: string;

  @ApiProperty({ example: '019a....', required: false })
  scenarioId?: string;

  @ApiProperty({ example: 'Ho Chi Minh City', required: false })
  locationName?: string;
}
