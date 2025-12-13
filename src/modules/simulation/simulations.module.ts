import { Module } from '@nestjs/common';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';
import { ScenarioModule } from '../scenario/scenario.module';
import { WeatherModule } from "../weather/weather.module";
import { LlmModule } from "../llm/llm.module";

@Module({
  imports: [ScenarioModule, WeatherModule, LlmModule],
  controllers: [SimulationsController],
  providers: [SimulationsService],
})
export class SimulationModule {
}
