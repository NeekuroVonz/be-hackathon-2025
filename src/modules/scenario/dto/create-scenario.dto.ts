import { ApiProperty } from '@nestjs/swagger';

export class CreateScenarioDto {
  @ApiProperty({ example: 'Ho Chi Minh City' })
  locationName: string;

  @ApiProperty({ example: 'vi', required: false })
  lang?: string;

  @ApiProperty({ example: 'Demo scenario for pitching', required: false })
  note?: string;
}
