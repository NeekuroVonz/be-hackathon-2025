import { Injectable } from '@nestjs/common';
import { ActionPriority, DisasterType, RunSimulationDto, SimulationResultDto, TopAction } from './dto/simulation.dto';
import { ScenarioService } from '../scenario/scenario.service';
import { WeatherService } from "../weather/weather.service";
import { LlmService } from "../llm/llm.service";

@Injectable()
export class SimulationsService {
  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly weatherService: WeatherService,
    private readonly llmService: LlmService,
  ) {
  }

  private buildTopActions(type: DisasterType): TopAction[] {
    const HIGH: ActionPriority = 'HIGH';
    const MEDIUM: ActionPriority = 'MEDIUM';

    if (type === DisasterType.FLOOD) {
      return [
        {
          rank: 1,
          title: 'Deploy Emergency Services',
          description: 'Prioritize dispatch to high-impact zones',
          icon: 'SIREN',
          priority: HIGH
        },
        {
          rank: 2,
          title: 'Establish Shelters',
          description: 'Activate designated public buildings',
          icon: 'HOME',
          priority: MEDIUM
        },
        {
          rank: 3,
          title: 'Communicate Public Alerts',
          description: 'Issue targeted alerts and evacuation guidance',
          icon: 'RADIO',
          priority: MEDIUM
        },
      ];
    }

    if (type === DisasterType.HURRICANE) {
      return [
        {
          rank: 1,
          title: 'Issue Evacuation Notices',
          description: 'Warn coastal and low-lying areas',
          icon: 'RADIO',
          priority: HIGH
        },
        {
          rank: 2,
          title: 'Pre-position Supplies',
          description: 'Stage food, water, medical kits',
          icon: 'BOX',
          priority: MEDIUM
        },
        {
          rank: 3,
          title: 'Secure Infrastructure',
          description: 'Protect power and critical facilities',
          icon: 'SHIELD',
          priority: MEDIUM
        },
      ];
    }

    if (type === DisasterType.EARTHQUAKE) {
      return [
        {
          rank: 1,
          title: 'Search & Rescue',
          description: 'Deploy SAR teams to affected areas',
          icon: 'SIREN',
          priority: HIGH
        },
        {
          rank: 2,
          title: 'Medical Triage',
          description: 'Set up emergency triage points',
          icon: 'PLUS',
          priority: HIGH
        },
        {
          rank: 3,
          title: 'Damage Assessment',
          description: 'Inspect bridges, roads, buildings',
          icon: 'CLIPBOARD',
          priority: MEDIUM
        },
      ];
    }

    // WILDFIRE
    return [
      {
        rank: 1,
        title: 'Contain Fire Lines',
        description: 'Deploy crews for containment',
        icon: 'FIRE',
        priority: HIGH
      },
      {
        rank: 2,
        title: 'Evacuate At-risk Areas',
        description: 'Evacuate based on spread direction',
        icon: 'TRUCK',
        priority: HIGH
      },
      {
        rank: 3,
        title: 'Air Quality Alerts',
        description: 'Notify vulnerable groups and schools',
        icon: 'WIND',
        priority: MEDIUM
      },
    ];
  }

  async run(dto: RunSimulationDto): Promise<SimulationResultDto> {
    const { lat, lon } = dto.location;
    // Use the first selected language, default to 'en'
    const primaryLang = dto.languages?.[0] ?? 'en';

    const scenario = await this.scenarioService.createScenarioFromSimulation({
      usrId: null,
      location: dto.location,
      lat,
      lon,
      lang: primaryLang,
      note: `Simulation run: ${dto.disasterType}`,
    });

    const weather = await this.weatherService.getCurrentWeatherByCoords(lat, lon, primaryLang, 'metric');

    const ai = await this.llmService.analyzeAndPredict({
      input: dto,
      weather,
      languages: dto.languages ?? ['en'],
    });

    const result = {
      simulationId: scenario.scenarioId,
      input: dto,
      languages: dto.languages ?? ['en'],
      map: {
        center: ai.map.center,           // {lat,lng}
        zoom: ai.map.zoom ?? 12,
        legend: [
          { level: 'HIGH', label: 'High Impact' },
          { level: 'MEDIUM', label: 'Medium Impact' },
          { level: 'LOW', label: 'Low Impact' },
        ],
        impactZones: ai.map.impactZones, // ✅ should be non-empty
      },
      kpis: ai.kpis,                      // ✅ dynamic
      topActions: ai.topActions,          // ✅ dynamic
      responsePlan: { url: `/api/simulations/${scenario.scenarioId}/plan`, scenarioId: scenario.scenarioId },
      generatedAt: new Date().toISOString(),
    };

    await this.scenarioService.updateGeneratedResult(scenario.scenarioId, {
      input: dto,
      resultSummary: result,
      planJson: { weather },
    });

    return result;
  }

  /** Used by simulations.controller.ts for the "View Full Response Plan" button */
  async getFullPlan(scenarioId: string) {
    const sc = await this.scenarioService.getScenario(scenarioId);
    return (sc as any).resultSummary ?? null;
    // return {
    //   scenarioId: sc.scenarioId,
    //   input: (sc as any).input ?? null,
    //   resultSummary: (sc as any).resultSummary ?? null,
    //   plan: (sc as any).planJson ?? null,
    // };
  }
}
