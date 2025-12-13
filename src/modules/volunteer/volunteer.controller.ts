import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { VolunteerService } from './volunteer.service';
import { CreateVolunteerDto } from './dto/create-volunteer.dto';

@ApiTags('Volunteer')
@Controller('volunteers')
export class VolunteerController {
  constructor(private readonly service: VolunteerService) {
  }

  @ApiOperation({ summary: 'Register a volunteer' })
  @ApiBody({ type: CreateVolunteerDto })
  @Post()
  @HttpCode(HttpStatus.OK)
  create(@Body() body: CreateVolunteerDto) {
    return this.service.create(body);
  }

  @ApiOperation({ summary: 'List volunteers (optionally near=lat,lon)' })
  @Get()
  @HttpCode(HttpStatus.OK)
  list(@Query('near') near?: string) {
    // For hackathon simplicity, near filter is not implemented deeply
    return this.service.list(near ? { lat: 0, lon: 0 } : undefined);
  }
}
