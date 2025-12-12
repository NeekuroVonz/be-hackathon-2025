import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { AccountUserModule } from "./modules/account-user/account-user.module";
import { WeatherModule } from "./modules/weather/weather.module";
import { LlmModule } from "./modules/llm/llm.module";
import { DisasterModule } from "./modules/disaster/disaster.module";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    AccountUserModule,
    WeatherModule,
    LlmModule,
    DisasterModule,
  ],
})
export class AppModule {
}
