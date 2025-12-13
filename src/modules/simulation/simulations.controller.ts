import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RunSimulationDto } from './dto/simulation.dto';
import { SimulationsService } from './simulations.service';
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags('Simulations')
@Controller('simulations')
export class SimulationsController {
  constructor(private readonly simulationsService: SimulationsService) {
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run a simulation and generate scenario + response' })
  @ApiBody({
    type: RunSimulationDto,
    examples: {
      flood: {
        summary: 'Flood with location coords',
        value: {
          disasterType: 'flood',
          rainfallIntensity: '',
          duration: 12,
          windSpeed: 0,
          magnitude: 0,
          fireSpreadRate: 0,
          location: {
            name: 'Tân Bình',
            country: 'VN',
            countryCode: 'VN',
            lat: 12.7106,
            lon: 108.2183,
            displayName: 'Tân Bình, Viet Nam',
          },
        },
      },
    },
  })
  run(@Body() dto: RunSimulationDto) {
    return this.simulationsService.run(dto);
  }

  // optional: for "View Full Response Plan"
  @Get(':scenarioId/plan')
  @HttpCode(HttpStatus.OK)
  getPlan(@Param('scenarioId') scenarioId: string) {
    return this.simulationsService.getFullPlan(scenarioId);
  }
}
