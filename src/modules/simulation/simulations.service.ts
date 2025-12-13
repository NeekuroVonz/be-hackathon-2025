import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ActionPriority, DisasterType, RunSimulationDto, SimulationResultDto, TopAction } from './dto/simulation.dto';
import { ScenarioService } from '../scenario/scenario.service';

@Injectable()
export class SimulationsService {
  constructor(private readonly scenarioService: ScenarioService) {
  }

  async run(dto: RunSimulationDto): Promise<SimulationResultDto> {
    const scenario = await this.scenarioService.createScenario({
      usrId: null,
      locationName: dto.location,
      lang: 'en',
      note: `Simulation run: ${dto.disasterType}`,
    });

    const simulationId = randomUUID();

    const result: SimulationResultDto = {
      simulationId,
      input: {
        disasterType: dto.disasterType,
        location: dto.location,
        duration: dto.duration,
        rainfallIntensity: dto.rainfallIntensity ?? null,
        windSpeed: dto.windSpeed ?? null,
        magnitude: dto.magnitude ?? null,
        fireSpreadRate: dto.fireSpreadRate ?? null,
      },
      map: {
        center: this.getCenterByLocation(dto.location),
        zoom: 12,
        legend: [
          { level: 'HIGH', label: 'High Impact' },
          { level: 'MEDIUM', label: 'Medium Impact' },
          { level: 'LOW', label: 'Low Impact' },
        ],
        impactZones: this.mockZones(dto.location),
      },
      kpis: this.mockKpis(dto.disasterType, dto),
      topActions: this.buildTopActions(dto.disasterType),
      responsePlan: {
        url: `/simulations/${scenario.scenarioId}/plan`,
        scenarioId: scenario.scenarioId,
      },
      generatedAt: new Date().toISOString(),
    };

    // store input + resultSummary into mdm_scenario
    await this.scenarioService.updateGeneratedResult(scenario.scenarioId, {
      input: dto,
      resultSummary: result,
    });

    return result;
  }

  async getFullPlan(scenarioId: string) {
    const scenario = await this.scenarioService.getScenario(scenarioId); // you already have getScenario()
    return {
      scenarioId: scenario.scenarioId,
      disasterType: scenario.resultSummary?.input?.disasterType,
      location: scenario.locationName,
      input: scenario.input,
      resultSummary: scenario.resultSummary,
      plan: scenario.planJson,
    };
  }

  private getCenterByLocation(location: string) {
    // replace with your Weather/Maps module later
    if (location.toLowerCase().includes('nha trang')) {
      return { lat: 12.2388, lng: 109.1967 };
    }
    return { lat: 0, lng: 0 };
  }

  private mockZones(_location: string) {
    return [
      {
        level: 'HIGH' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [109.1881, 12.2502],
              [109.2055, 12.2487],
              [109.2031, 12.2321],
              [109.1868, 12.2355],
              [109.1881, 12.2502],
            ],
          ],
        },
      },
    ];
  }

  private mockKpis(type: DisasterType, _dto: RunSimulationDto) {
    // you can map by params later
    if (type === DisasterType.FLOOD) return { householdsAffected: 1500, roadBlockages: 42, sheltersNeeded: 3200 };
    if (type === DisasterType.HURRICANE) return { householdsAffected: 2600, roadBlockages: 65, sheltersNeeded: 4100 };
    if (type === DisasterType.EARTHQUAKE) return { householdsAffected: 1800, roadBlockages: 110, sheltersNeeded: 2900 };
    return { householdsAffected: 900, roadBlockages: 35, sheltersNeeded: 1400 };
  }

  private buildTopActions(type: DisasterType): TopAction[] {
    const HIGH: ActionPriority = 'HIGH';
    const MEDIUM: ActionPriority = 'MEDIUM';
    const LOW: ActionPriority = 'LOW';

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
          description: 'Issue evacuation orders for specific areas',
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
          description: 'Warn coastal zones and low-lying areas',
          icon: 'RADIO',
          priority: HIGH
        },
        {
          rank: 2,
          title: 'Pre-position Supplies',
          description: 'Stage food, water, and medical kits',
          icon: 'BOX',
          priority: MEDIUM
        },
        {
          rank: 3,
          title: 'Secure Infrastructure',
          description: 'Protect power lines and critical facilities',
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
          description: 'Deploy SAR teams to collapsed structures',
          icon: 'SIREN',
          priority: HIGH
        },
        {
          rank: 2,
          title: 'Medical Triage',
          description: 'Set up triage points and emergency transport',
          icon: 'PLUS',
          priority: HIGH
        },
        {
          rank: 3,
          title: 'Damage Assessment',
          description: 'Inspect bridges and roads for safety',
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
        description: 'Deploy crews to build containment',
        icon: 'FIRE',
        priority: HIGH
      },
      {
        rank: 2,
        title: 'Evacuate At-risk Areas',
        description: 'Move residents away from spread path',
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
}
