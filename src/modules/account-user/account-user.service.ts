import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AccountUser } from './account-user.entity';

@Injectable()
export class AccountUserService {
  constructor(
    @InjectRepository(AccountUser)
    private readonly accountUserRepo: Repository<AccountUser>,
  ) {
  }

  // Đăng ký user mới
  async createUser(username: string, rawPassword: string, creUsrId?: string) {
    const existing = await this.accountUserRepo.findOne({
      where: { username },
    });
    if (existing) {
      throw new Error('Username already exists');
    }

    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = this.accountUserRepo.create({
      username,
      password: passwordHash,
      creUsrId: creUsrId ?? username,
      updUsrId: creUsrId ?? username,
    });

    const saved = await this.accountUserRepo.save(user);
    // bỏ password khi trả ra
    const { password, ...safeUser } = saved;
    return safeUser;
  }

  // Tìm theo username (dùng cho login)
  findByUsername(username: string) {
    return this.accountUserRepo.findOne({ where: { username } });
  }

  // Tìm theo usrId (dùng cho /me)
  async findById(usrId: string) {
    const user = await this.accountUserRepo.findOne({ where: { usrId } });
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
