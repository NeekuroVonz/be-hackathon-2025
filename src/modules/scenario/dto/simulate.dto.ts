import { ApiProperty } from '@nestjs/swagger';

export class SimulateDto {
  @ApiProperty({ example: 1.3, required: false, description: 'Multiply rain severity for demo' })
  rainMultiplier?: number;

  @ApiProperty({ example: 1.2, required: false, description: 'Multiply wind severity for demo' })
  windMultiplier?: number;

  @ApiProperty({ example: 6, required: false, description: 'Duration in hours (demo parameter)' })
  durationHours?: number;
}
