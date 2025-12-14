import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatRequestDto } from "./dto/chat.dto";

@ApiTags('Chat')
@Controller('/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {
  }

  @Post()
  @ApiBody({
    type: ChatRequestDto,
    examples: {
      hk: {
        summary: 'Weather in Hong Kong',
        value: { message: 'What is the weather in Hong Kong?', lang: 'en' },
      },
      vn: {
        summary: 'General weather question (fallback to default location)',
        value: { message: 'Do I need an umbrella today?', lang: 'en' },
      },
    },
  })
  chat(@Body() dto: ChatRequestDto) {
    return this.chatService.chat(dto);
  }
}
