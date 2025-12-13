import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scenario } from './scenario.entity';
import { ScenarioService } from './scenario.service';
import { ScenarioController } from './scenario.controller';
import { WeatherModule } from '../weather/weather.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [TypeOrmModule.forFeature([Scenario]), WeatherModule, LlmModule],
  providers: [ScenarioService],
  controllers: [ScenarioController],
  exports: [ScenarioService],
})
export class ScenarioModule {}
