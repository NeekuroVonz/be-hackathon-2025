import { Module } from '@nestjs/common';
import { DisasterController } from './disaster.controller';
import { WeatherModule } from '../weather/weather.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [WeatherModule, LlmModule],
  controllers: [DisasterController],
})
export class DisasterModule {
}
