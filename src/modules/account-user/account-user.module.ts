import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountUser } from './account-user.entity';
import { AccountUserService } from './account-user.service';

@Module({
  imports: [TypeOrmModule.forFeature([AccountUser])],
  providers: [AccountUserService],
  exports: [AccountUserService],
})
export class AccountUserModule {
}
