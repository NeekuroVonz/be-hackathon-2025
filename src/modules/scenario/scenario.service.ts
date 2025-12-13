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

  // Create a scenario and compute: weather -> analysis -> zones/resources/plan
  async createScenario(input: {
    usrId?: string | null;
    locationName: string;
    lang?: string;
    note?: string;
  }) {
    const lang = input.lang ?? 'en';

    const weather = await this.weatherService.getCurrentWeather(
      input.locationName,
      lang,
    );

    const analysis = await this.llmService.analyzeDisasterRisk(
      input.locationName,
      weather,
      lang,
    );

    const zones = this.generateZonesGeoJSON(weather, analysis);
    const resources = this.estimateResources(weather, analysis);
    const plan = await this.generateResponsePlanLLM(
      input.locationName,
      lang,
      weather,
      analysis,
      resources,
    );

    const entity = this.scenarioRepo.create({
      usrId: input.usrId ?? null,
      locationName: input.locationName,
      lang,
      note: input.note ?? null,
      weatherJson: weather,
      analysisJson: analysis,
      simulationJson: null,
      zonesGeojson: zones,
      resourcesJson: resources,
      planJson: plan,
    });

    return this.scenarioRepo.save(entity);
  }

  async listMyScenarios(usrId: string) {
    return this.scenarioRepo.find({
      where: { usrId },
      order: { creDt: 'DESC' },
    });
  }

  async getScenario(id: string) {
    const sc = await this.scenarioRepo.findOne({ where: { scenarioId: id } });
    if (!sc) throw new NotFoundException('Scenario not found');
    return sc;
  }

  async deleteScenario(id: string, usrId: string) {
    const sc = await this.getScenario(id);
    if (sc.usrId && sc.usrId !== usrId) {
      // For hackathon simplicity, just pretend not found
      throw new NotFoundException('Scenario not found');
    }
    await this.scenarioRepo.delete({ scenarioId: id });
    return { deleted: true };
  }

  // Apply simulation knobs and recompute outputs
  async simulateScenario(
    id: string,
    usrId: string,
    knobs: { rainMultiplier?: number; windMultiplier?: number; durationHours?: number },
  ) {
    const sc = await this.getScenario(id);
    if (sc.usrId && sc.usrId !== usrId) {
      throw new NotFoundException('Scenario not found');
    }

    const weather = sc.weatherJson ?? {};
    const simulatedWeather = this.applySimulation(weather, knobs);

    const analysis = await this.llmService.analyzeDisasterRisk(
      sc.locationName,
      simulatedWeather,
      sc.lang,
    );

    const zones = this.generateZonesGeoJSON(simulatedWeather, analysis);
    const resources = this.estimateResources(simulatedWeather, analysis);
    const plan = await this.generateResponsePlanLLM(
      sc.locationName,
      sc.lang,
      simulatedWeather,
      analysis,
      resources,
    );

    sc.simulationJson = knobs;
    sc.analysisJson = analysis;
    sc.zonesGeojson = zones;
    sc.resourcesJson = resources;
    sc.planJson = plan;
    sc.updDt = new Date();

    return this.scenarioRepo.save(sc);
  }

  // --- Helpers ---

  // For demo: tweak wind/rain-like signals (WeatherAPI current.json does not always include rainfall)
  private applySimulation(weather: any, knobs: any) {
    const rainMultiplier = Number(knobs?.rainMultiplier ?? 1);
    const windMultiplier = Number(knobs?.windMultiplier ?? 1);

    const cloned = JSON.parse(JSON.stringify(weather));

    // Wind
    if (cloned?.current?.wind_kph != null) {
      cloned.current.wind_kph = Number(cloned.current.wind_kph) * windMultiplier;
    }

    // "Rain signal" approximation:
    // If current.precip_mm exists, multiply it; else inject a demo precip value
    if (cloned?.current?.precip_mm != null) {
      cloned.current.precip_mm = Number(cloned.current.precip_mm) * rainMultiplier;
    } else {
      cloned.current = cloned.current || {};
      cloned.current.precip_mm = 5 * rainMultiplier; // demo baseline
    }

    // Duration is stored in simulationJson only (you can also embed it here if you want)
    return cloned;
  }

  // Generate a simple circle zone around the location (GeoJSON) using WeatherAPI lat/lon
  private generateZonesGeoJSON(weather: any, analysis: any) {
    const lat = weather?.location?.lat;
    const lon = weather?.location?.lon;

    // Fallback if lat/lon missing
    if (lat == null || lon == null) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Pick radius based on riskLevel (demo heuristic)
    const risk = String(analysis?.riskLevel || 'LOW').toUpperCase();
    const radiusKm =
      risk === 'EXTREME' ? 30 :
        risk === 'HIGH' ? 20 :
          risk === 'MEDIUM' ? 12 : 6;

    // Use a "Point + radius" feature (front-end can draw a circle)
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            riskLevel: risk,
            radiusKm,
            possibleDisasters: analysis?.possibleDisasters ?? [],
          },
          geometry: {
            type: 'Point',
            coordinates: [lon, lat],
          },
        },
      ],
    };
  }

  // Simple resources heuristic (demo)
  private estimateResources(weather: any, analysis: any) {
    const risk = String(analysis?.riskLevel || 'LOW').toUpperCase();
    const disasters: string[] = Array.isArray(analysis?.possibleDisasters)
      ? analysis.possibleDisasters
      : [];

    // Base numbers by risk
    const base =
      risk === 'EXTREME' ? 5 :
        risk === 'HIGH' ? 3 :
          risk === 'MEDIUM' ? 2 : 1;

    // Small multipliers by disaster types (demo)
    const hasFlood = disasters.some((d) => /flood|lũ/i.test(d));
    const hasStorm = disasters.some((d) => /storm|bão/i.test(d));
    const hasThunder = disasters.some((d) => /thunder|dông/i.test(d));
    const hasLandslide = disasters.some((d) => /landslide|sạt/i.test(d));
    const hasAir = disasters.some((d) => /air|không khí/i.test(d));

    const multiplier =
      (hasFlood ? 1.3 : 1) *
      (hasStorm ? 1.4 : 1) *
      (hasThunder ? 1.2 : 1) *
      (hasLandslide ? 1.3 : 1) *
      (hasAir ? 1.1 : 1);

    const factor = base * multiplier;

    return {
      volunteersNeeded: Math.round(30 * factor),
      shelters: Math.max(1, Math.round(2 * factor)),
      medicalKits: Math.round(50 * factor),
      waterLiters: Math.round(500 * factor),
      foodPacks: Math.round(300 * factor),
      trucks: Math.max(1, Math.round(2 * factor)),
      notes: 'Demo estimation based on riskLevel and disaster types.',
    };
  }

  // Generate a response plan via LLM (structured JSON)
  private async generateResponsePlanLLM(
    locationName: string,
    lang: string,
    weatherData: any,
    analysis: any,
    resources: any,
  ) {
    // Keep this prompt short to reduce tokens (important if called many times)
    const prompt = `
      You are generating an emergency response plan for DEMO purposes.
      
      Return PURE JSON ONLY (no markdown). Write in the language specified by lang="${lang}".
      
      JSON schema:
      {
        "summary": "short summary",
        "phases": [
          { "name": "Preparation", "actions": ["..."] },
          { "name": "Response", "actions": ["..."] },
          { "name": "Recovery", "actions": ["..."] }
        ],
        "checklist": ["..."],
        "resourceAllocation": {
          "volunteersNeeded": number,
          "shelters": number,
          "medicalKits": number,
          "waterLiters": number,
          "foodPacks": number,
          "trucks": number
        }
      }
      
      Location: ${locationName}
      Weather: ${JSON.stringify(weatherData?.current ?? {}, null, 2)}
      Analysis: ${JSON.stringify(analysis ?? {}, null, 2)}
      Resources: ${JSON.stringify(resources ?? {}, null, 2)}
    `;

    // Reuse your existing LLM call method by adding a small helper in LlmService,
    // OR (fastest) call it here with axios again. For speed, reuse LlmService:
    // If you don't have a "generateJson" method, add one.
    if ((this.llmService as any).generateJson) {
      return (this.llmService as any).generateJson(prompt, lang);
    }

    // Fallback: return a simple plan without LLM (still demo-friendly)
    return {
      summary: 'Demo plan generated without LLM helper.',
      phases: [
        { name: 'Preparation', actions: ['Monitor updates', 'Prepare emergency supplies'] },
        { name: 'Response', actions: ['Follow evacuation guidance', 'Coordinate volunteers'] },
        { name: 'Recovery', actions: ['Assess damage', 'Distribute supplies', 'Restore services'] },
      ],
      checklist: ['First aid kit', 'Water', 'Food', 'Flashlight', 'Power bank'],
      resourceAllocation: {
        volunteersNeeded: resources?.volunteersNeeded ?? 30,
        shelters: resources?.shelters ?? 1,
        medicalKits: resources?.medicalKits ?? 50,
        waterLiters: resources?.waterLiters ?? 500,
        foodPacks: resources?.foodPacks ?? 300,
        trucks: resources?.trucks ?? 1,
      },
    };
  }

  async updateGeneratedResult(
    scenarioId: string,
    data: { input?: any; resultSummary?: any },
  ) {
    await this.scenarioRepo.update(
      { scenarioId },
      {
        input: data.input,
        resultSummary: data.resultSummary,
        updDt: new Date(),
      },
    );
  }
}
