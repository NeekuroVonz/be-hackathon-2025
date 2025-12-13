import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {
  }

  @ApiOperation({ summary: 'Chat about weather/disaster/scenario' })
  @ApiBody({ type: ChatDto })
  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(@Body() body: ChatDto) {
    return this.chatService.chat(body);
  }
}
