import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'newuser', description: 'Unique username' })
  username: string;

  @ApiProperty({ example: '123456', description: 'User password' })
  password: string;
}
