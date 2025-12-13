import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { WeatherModule } from "./modules/weather/weather.module";
import { LlmModule } from "./modules/llm/llm.module";
import { ScenarioModule } from "./modules/scenario/scenario.module";
import { ChatModule } from "./modules/chat/chat.module";
import { SimulationModule } from "./modules/simulation/simulations.module";
import { AccountUserModule } from "./modules/account-user/account-user.module";

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
    WeatherModule,
    LlmModule,
    ScenarioModule,
    ChatModule,
    SimulationModule,
    AccountUserModule
  ],
})
export class AppModule {
}
