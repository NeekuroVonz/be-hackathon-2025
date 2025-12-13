import { Module } from '@nestjs/common';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';
import { ScenarioModule } from '../scenario/scenario.module';
import { WeatherModule } from "../weather/weather.module";

@Module({
  imports: [ScenarioModule, WeatherModule],
  controllers: [SimulationsController],
  providers: [SimulationsService],
})
export class SimulationModule {
}
