import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scenario } from './scenario.entity';
import { WeatherService } from '../weather/weather.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ScenarioService {
  constructor(
    @InjectRepository(Scenario)
    private readonly scenarioRepo: Repository<Scenario>,
    private readonly weatherService: WeatherService,
    private readonly llmService: LlmService,
  ) {
  }

  /**
   * Create scenario record from simulation request.
   * Accepts the UI payload shape: { location: { lat, lon, ... }, ... }
   */
  async createScenarioFromSimulation(input: any) {
    const location = input?.location;
    const lat = Number(location?.lat);
    const lon = Number(location?.lon);

    const scenario = this.scenarioRepo.create({
      usrId: input?.usrId ?? null,
      lat: Number.isFinite(lat) ? lat : null,
      lon: Number.isFinite(lon) ? lon : null,
      location: location ?? null,
      lang: input?.lang ?? 'en',
      note: input?.note ?? `Simulation run: ${String(input?.disasterType ?? '')}`,
      input,
    });

    return this.scenarioRepo.save(scenario);
  }

  async runScenarioAnalysis(scenarioId: string) {
    const scenario = await this.scenarioRepo.findOne({
      where: { scenarioId },
    });
    if (!scenario) throw new NotFoundException('Scenario not found');

    const input = scenario.input;
    const lat = Number(input?.location?.lat);
    const lon = Number(input?.location?.lon);

    // 1) Weather by coords
    const weather = await this.weatherService.getCurrentWeatherByCoords(
      lat,
      lon,
      'en',
      'metric',
    );

    // 2) AI analyze & predict
    const ai = await this.llmService.analyzeAndPredict({ input, weather });

    // 3) Save results for FE + full plan
    const resultSummary = {
      simulationId: scenario.scenarioId,
      input,
      map: {
        center: ai.map.center,
        zoom: ai.map.zoom,
        legend: [
          { level: 'HIGH', label: 'High Impact' },
          { level: 'MEDIUM', label: 'Medium Impact' },
          { level: 'LOW', label: 'Low Impact' },
        ],
        impactZones: ai.map.impactZones,
      },
      kpis: ai.kpis,
      topActions: ai.topActions,
      responsePlan: {
        url: `/api/simulations/${scenario.scenarioId}/plan`,
        scenarioId: scenario.scenarioId,
      },
      generatedAt: new Date().toISOString(),
    };

    scenario.resultSummary = resultSummary;
    // store full plan + weather for debugging
    (scenario as any).planJson = { plan: ai.plan, weather }; // if your entity doesn't have planJson yet, add it later

    scenario.updDt = new Date();
    await this.scenarioRepo.save(scenario);

    return resultSummary;
  }

  async getScenarioPlan(scenarioId: string) {
    const scenario = await this.scenarioRepo.findOne({ where: { scenarioId } });
    if (!scenario) throw new NotFoundException('Scenario not found');

    return {
      scenarioId: scenario.scenarioId,
      input: scenario.input,
      resultSummary: scenario.resultSummary,
      plan: (scenario as any).planJson ?? null,
    };
  }

  // -----------------------------
  // Backward-compatible methods
  // (Other modules/controllers are calling these names)
  // -----------------------------

  async getScenario(id: string) {
    const sc = await this.scenarioRepo.findOne({ where: { scenarioId: id } });
    if (!sc) throw new NotFoundException('Scenario not found');
    return sc;
  }

  /**
   * Get specific fields from a scenario to avoid fetching the entire record.
   * Useful for endpoints that only need a subset of data (e.g., zones, resources, plan).
   */
  async getScenarioField<K extends keyof Scenario>(
    id: string,
    field: K,
  ): Promise<Scenario[K] | null> {
    const sc = await this.scenarioRepo.findOne({
      where: { scenarioId: id },
      select: ['scenarioId', field],
    });
    if (!sc) throw new NotFoundException('Scenario not found');
    return sc[field];
  }

  /** Used by scenario.controller.ts */
  async createScenario(dto: any) {
    const entity = this.scenarioRepo.create({
      usrId: dto?.usrId ?? null,
      lat: dto?.lat ?? dto?.location?.lat ?? null,
      lon: dto?.lon ?? dto?.location?.lon ?? null,
      location: dto?.location ?? null,
      lang: dto?.lang ?? 'en',
      note: dto?.note ?? null,
      input: dto?.input ?? null,
    } as any);
    return this.scenarioRepo.save(entity);
  }

  /** Used by scenario.controller.ts */
  async listMyScenarios(usrId: string) {
    // Select only essential fields for listing (avoid fetching large JSONB columns)
    const selectFields: (keyof Scenario)[] = [
      'scenarioId',
      'usrId',
      'lat',
      'lon',
      'location',
      'lang',
      'note',
      'creDt',
      'updDt',
    ];

    // If you have usrId column, filter by it; otherwise return recent scenarios.
    if (usrId) {
      return this.scenarioRepo.find({
        where: { usrId } as any,
        order: { creDt: 'DESC' as any },
        take: 50,
        select: selectFields,
      } as any);
    }
    return this.scenarioRepo.find({
      order: { creDt: 'DESC' as any },
      take: 50,
      select: selectFields,
    } as any);
  }

  /** Used by scenario.controller.ts */
  async deleteScenario(id: string, _usrId: string) {
    await this.scenarioRepo.delete({ scenarioId: id } as any);
    return { success: true };
  }

  /** Used by scenario.controller.ts */
  async simulateScenario(id: string, _usrId: string, body: any) {
    // Save latest input overrides then run analysis
    await this.updateGeneratedResult(id, { input: body });
    return this.runScenarioAnalysis(id);
  }

  async updateGeneratedResult(
    scenarioId: string,
    data: { input?: any; resultSummary?: any; planJson?: any },
  ) {
    await this.scenarioRepo.update(
      { scenarioId },
      {
        input: data.input,
        resultSummary: data.resultSummary,
        planJson: data.planJson,
        updDt: new Date(),
      } as any,
    );
  }
}
