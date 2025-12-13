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
        summary: 'Flood - Nha Trang',
        value: {
          disasterType: 'flood',
          rainfallIntensity: 35,
          duration: 12,
          windSpeed: 0,
          magnitude: 0,
          fireSpreadRate: 0,
          location: 'Nha Trang',
        },
      },
      earthquake: {
        summary: 'Earthquake - Nha Trang',
        value: {
          disasterType: 'earthquake',
          rainfallIntensity: null,
          duration: 12,
          windSpeed: 0,
          magnitude: 5.6,
          fireSpreadRate: 0,
          location: 'Nha Trang',
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
