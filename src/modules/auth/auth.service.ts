import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountUserService } from '../account-user/account-user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly accountUserService: AccountUserService,
  ) {
  }

  async register(username: string, password: string) {
    return this.accountUserService.createUser(username, password);
  }

  async validateUser(username: string, password: string) {
    const user = await this.accountUserService.findByUsername(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _pwd, ...safeUser } = user;
    return safeUser;
  }

  async findById(usrId: string) {
    return this.accountUserService.findById(usrId);
  }
}
