import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AidService } from './aid.service';

@ApiTags('Aid')
@Controller('aid')
export class AidController {
  constructor(private readonly aidService: AidService) {
  }

  @ApiOperation({ summary: 'List aid centers (static demo data)' })
  @Get('centers')
  @HttpCode(HttpStatus.OK)
  centers(@Query('near') near?: string) {
    // Hackathon-simple: ignore near filtering
    return this.aidService.listCenters();
  }

  @ApiOperation({ summary: 'Get safety tips by disasterType (optional)' })
  @Get('tips')
  @HttpCode(HttpStatus.OK)
  tips(@Query('disasterType') disasterType?: string) {
    return this.aidService.getTips(disasterType);
  }
}
