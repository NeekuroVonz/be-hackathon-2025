import { ApiProperty } from '@nestjs/swagger';

export class CreateVolunteerDto {
  @ApiProperty({ example: 'Nguyen Van A' })
  name: string;

  @ApiProperty({ example: '0909000000', required: false })
  phone?: string;

  @ApiProperty({ example: 'first aid, logistics', required: false })
  skills?: string;

  @ApiProperty({ example: 10.77, required: false })
  lat?: number;

  @ApiProperty({ example: 106.67, required: false })
  lon?: number;
}
