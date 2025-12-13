import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested, } from 'class-validator';

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

export class LocationDto {
  @ApiProperty({ example: 'Tân Bình' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'VN' })
  @IsString()
  country: string;

  @ApiProperty({ example: 'VN' })
  @IsString()
  countryCode: string;

  @ApiProperty({ example: 12.7106 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 108.2183 })
  @IsNumber()
  lon: number;

  @ApiProperty({ example: 'Tân Bình, Viet Nam' })
  @IsString()
  displayName: string;
}

export class RunSimulationDto {
  @ApiProperty({ enum: DisasterType, example: DisasterType.FLOOD })
  @IsEnum(DisasterType)
  disasterType: DisasterType;

  // ✅ transform "" -> null, "35" -> 35
  @ApiPropertyOptional({ example: 35, description: 'mm/hr (required for flood)' })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  @Min(0)
  rainfallIntensity?: number | null;

  @ApiProperty({ example: 12, minimum: 1 })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  @Min(0)
  windSpeed?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  @Min(0)
  magnitude?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null || value === undefined ? null : Number(value)))
  @IsNumber()
  @Min(0)
  fireSpreadRate?: number | null;

  @ApiProperty({ type: LocationDto })
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}

export interface SimulationResultDto {
  simulationId: string;
  input: any;
  map: any;
  kpis: any;
  topActions: TopAction[];
  responsePlan: { url: string; scenarioId: string };
  generatedAt: string;
}
