import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ScenarioModule } from '../scenario/scenario.module';
import { WeatherModule } from '../weather/weather.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [ScenarioModule, WeatherModule, LlmModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {
}
