import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccountUserModule } from "../account-user/account-user.module";

@Module({
  imports: [AccountUserModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {
}
