import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'mdm_scenario' })
export class Scenario {
  @PrimaryGeneratedColumn('uuid', { name: 'scenario_id' })
  scenarioId: string;

  @Column({ name: 'usr_id', type: 'uuid', nullable: true })
  usrId: string | null;

  @Column({ name: 'location_name', type: 'varchar', length: 255 })
  locationName: string;

  @Column({ name: 'lang', type: 'varchar', length: 20, default: 'en' })
  lang: string;

  // Raw weather payload from WeatherAPI current.json (JSONB)
  @Column({ name: 'weather_json', type: 'jsonb', nullable: true })
  weatherJson: any;

  // LLM analysis result (JSONB): riskLevel, possibleDisasters, explanation, recommendedActions
  @Column({ name: 'analysis_json', type: 'jsonb', nullable: true })
  analysisJson: any;

  // Simulation knobs (JSONB): e.g. multipliers
  @Column({ name: 'simulation_json', type: 'jsonb', nullable: true })
  simulationJson: any;

  // GeoJSON zones (JSONB) for the map
  @Column({ name: 'zones_geojson', type: 'jsonb', nullable: true })
  zonesGeojson: any;

  // Resource estimation (JSONB)
  @Column({ name: 'resources_json', type: 'jsonb', nullable: true })
  resourcesJson: any;

  // Auto-generated response plan (JSONB)
  @Column({ name: 'plan_json', type: 'jsonb', nullable: true })
  planJson: any;

  @Column({ name: 'note', type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'jsonb', nullable: true })
  input: any;

  @Column({ type: 'jsonb', nullable: true })
  resultSummary: any;

  @Column({ name: 'cre_dt', type: 'timestamptz', default: () => 'now()' })
  creDt: Date;

  @Column({ name: 'upd_dt', type: 'timestamptz', default: () => 'now()' })
  updDt: Date;
}
