import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScenarioService } from './scenario.service';
import { CreateScenarioDto } from './dto/create-scenario.dto';
import { SimulateDto } from './dto/simulate.dto';

@ApiTags('Scenario')
@Controller('scenarios')
export class ScenarioController {
  constructor(private readonly scenarioService: ScenarioService) {
  }

  private getUserId(req: any): string | null {
    return req?.session?.userId ?? null;
  }

  @ApiOperation({ summary: 'Create scenario (weather -> analysis -> zones/resources/plan)' })
  @ApiBody({ type: CreateScenarioDto })
  @Post()
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreateScenarioDto, @Req() req: any) {
    try {
      return await this.scenarioService.createScenario({
        usrId: this.getUserId(req),
        locationName: body.locationName,
        lang: body.lang ?? 'en',
        note: body.note,
      });
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Create scenario failed');
    }
  }

  @ApiOperation({ summary: 'List my scenarios (requires session login)' })
  @Get()
  @HttpCode(HttpStatus.OK)
  async listMine(@Req() req: any) {
    const usrId = this.getUserId(req);
    if (!usrId) throw new BadRequestException('Not logged in');
    return this.scenarioService.listMyScenarios(usrId);
  }

  @ApiOperation({ summary: 'Get scenario detail' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async detail(@Param('id') id: string) {
    return this.scenarioService.getScenario(id);
  }

  @ApiOperation({ summary: 'Delete scenario (owner only)' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @Req() req: any) {
    const usrId = this.getUserId(req);
    if (!usrId) throw new BadRequestException('Not logged in');
    return this.scenarioService.deleteScenario(id, usrId);
  }

  @ApiOperation({ summary: 'Run what-if simulation on scenario (owner only)' })
  @ApiBody({ type: SimulateDto })
  @Post(':id/simulate')
  @HttpCode(HttpStatus.OK)
  async simulate(@Param('id') id: string, @Body() body: SimulateDto, @Req() req: any) {
    const usrId = this.getUserId(req);
    if (!usrId) throw new BadRequestException('Not logged in');
    return this.scenarioService.simulateScenario(id, usrId, body);
  }

  @ApiOperation({ summary: 'Get impacted zones GeoJSON for map' })
  @Get(':id/zones')
  @HttpCode(HttpStatus.OK)
  async zones(@Param('id') id: string) {
    const sc = await this.scenarioService.getScenario(id);
    return sc.zonesGeojson ?? { type: 'FeatureCollection', features: [] };
  }

  @ApiOperation({ summary: 'Get resource estimation' })
  @Get(':id/resources')
  @HttpCode(HttpStatus.OK)
  async resources(@Param('id') id: string) {
    const sc = await this.scenarioService.getScenario(id);
    return sc.resourcesJson ?? {};
  }

  @ApiOperation({ summary: 'Get auto-generated response plan' })
  @Get(':id/plan')
  @HttpCode(HttpStatus.OK)
  async plan(@Param('id') id: string) {
    const sc = await this.scenarioService.getScenario(id);
    return sc.planJson ?? {};
  }
}
