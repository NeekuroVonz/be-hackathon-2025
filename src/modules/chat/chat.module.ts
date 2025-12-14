import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { WeatherModule } from '../weather/weather.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [WeatherModule, LlmModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {
}
