import { Module } from '@nestjs/common';
import { SimulationsController } from './simulations.controller';
import { SimulationsService } from './simulations.service';
import { ScenarioModule } from '../scenario/scenario.module';

@Module({
  imports: [ScenarioModule],
  controllers: [SimulationsController],
  providers: [SimulationsService],
})
export class SimulationModule {
}
