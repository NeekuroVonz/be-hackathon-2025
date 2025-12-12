import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Username to login' })
  username: string;

  @ApiProperty({ example: '123456', description: 'User password' })
  password: string;
}
