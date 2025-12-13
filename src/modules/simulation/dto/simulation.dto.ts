import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum DisasterType {
  FLOOD = 'flood',
  EARTHQUAKE = 'earthquake',
  HURRICANE = 'hurricane',
  WILDFIRE = 'wildfire',
}

export type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type TopAction = {
  rank: number;
  title: string;
  description: string;
  icon: string;
  priority: ActionPriority;
};

export class RunSimulationDto {
  @ApiProperty({ enum: DisasterType, example: DisasterType.FLOOD })
  disasterType: DisasterType;

  @ApiProperty({ example: 'Nha Trang' })
  location: string;

  @ApiProperty({ example: 12, minimum: 1 })
  duration: number;

  @ApiPropertyOptional({ example: 35, description: 'mm/hr (required for flood)' })
  rainfallIntensity?: number | null;

  @ApiPropertyOptional({ example: 60, description: 'km/h (required for hurricane)' })
  windSpeed?: number | null;

  @ApiPropertyOptional({ example: 5.6, description: 'richter (required for earthquake)' })
  magnitude?: number | null;

  @ApiPropertyOptional({ example: 2.1, description: 'rate (required for wildfire)' })
  fireSpreadRate?: number | null;
}

// ---------- response types for FE ----------
export type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SimulationResultDto {
  simulationId: string;

  input: {
    disasterType: DisasterType;
    location: string;
    duration: number;
    rainfallIntensity: number | null;
    windSpeed: number | null;
    magnitude: number | null;
    fireSpreadRate: number | null;
  };

  map: {
    center: { lat: number; lng: number };
    zoom: number;
    legend: Array<{ level: ImpactLevel; label: string }>;
    impactZones: Array<{
      level: ImpactLevel;
      geometry: {
        type: 'Polygon';
        coordinates: number[][][]; // [ [ [lng,lat], ... ] ]
      };
    }>;
  };

  kpis: {
    householdsAffected: number;
    roadBlockages: number;
    sheltersNeeded: number;
  };

  topActions: TopAction[];

  responsePlan: {
    url: string;
    scenarioId: string;
  };

  generatedAt: string;
}
