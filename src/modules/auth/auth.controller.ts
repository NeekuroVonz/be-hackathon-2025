import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Req, } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {
  }

  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: RegisterDto })
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: RegisterDto) {
    try {
      const user = await this.authService.register(
        body.username,
        body.password,
      );
      return user;
    } catch (error: any) {
      // ✅ mọi lỗi -> 400
      throw new BadRequestException(
        error?.message || 'Register failed',
      );
    }
  }

  @ApiOperation({ summary: 'Login with username/password (session)' })
  @ApiBody({ type: LoginDto })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Req() req: any) {
    try {
      const user = await this.authService.validateUser(
        body.username,
        body.password,
      );
      req.session.userId = user.usrId;
      return user;
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Login failed',
      );
    }
  }

  @ApiOperation({ summary: 'Get current logged-in user (session)' })
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async me(@Req() req: any) {
    try {
      if (!req.session.userId) {
        // bạn muốn lỗi cũng là 400
        throw new BadRequestException('Not logged in');
      }
      return this.authService.findById(req.session.userId);
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Get current user failed',
      );
    }
  }

  @ApiOperation({ summary: 'Logout current user' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    try {
      req.session.destroy(() => {
      });
      return { loggedOut: true };
    } catch (error: any) {
      throw new BadRequestException(
        error?.message || 'Logout failed',
      );
    }
  }
}
