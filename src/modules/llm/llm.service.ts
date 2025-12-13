import { Injectable } from '@nestjs/common';
import axios from 'axios';

type ImpactLevel = 'HIGH' | 'MEDIUM' | 'LOW';
type ActionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type LlmSimulationResult = {
  map: {
    center: { lat: number; lng: number };
    zoom: number;
    impactZones: Array<{
      level: ImpactLevel;
      geometry: { type: 'Polygon'; coordinates: number[][][] };
    }>;
  };
  kpis: {
    householdsAffected: number;
    roadBlockages: number;
    sheltersNeeded: number;
  };
  topActions: Array<{
    rank: number;
    title: string;
    description: string;
    icon: string;
    priority: ActionPriority;
  }>;
  plan: {
    summary: string;
    steps: Array<{ title: string; details: string }>;
  };
};

@Injectable()
export class LlmService {
  private readonly geminiApiKey = process.env.GEMINI_API_KEY;

  // -----------------------------
  // Backward-compatible methods
  // (Other modules/controllers are calling these names)
  // -----------------------------

  /** Used by chat.service.ts (older code path) */
  async generateJson(prompt: string) {
    // For compatibility, treat the prompt as additional context.
    // If you later want strict prompt->json, add a dedicated Gemini call here.
    const result = await this.analyzeAndPredict({
      input: { disasterType: 'flood', duration: 1, location: { lat: 0, lon: 0 }, prompt },
      weather: {},
    });
    return result;
  }

  /** Used by disaster.controller.ts (older code path) */
  async analyzeDisasterRisk(input: any) {
    const result = await this.analyzeAndPredict({ input, weather: {} });
    return {
      kpis: result.kpis,
      topActions: result.topActions,
      map: result.map,
      plan: result.plan,
    };
  }

  async analyzeAndPredict(args: {
    input: any;
    weather: any;
  }): Promise<LlmSimulationResult> {
    // If no API key, still return dynamic-ish fallback (hackathon safe)
    if (!this.geminiApiKey) {
      return this.fallback(args.input);
    }

    const prompt = this.buildPrompt(args.input, args.weather);

    try {
      const res = await axios.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
        { contents: [{ parts: [{ text: prompt }] }] },
        { params: { key: this.geminiApiKey } },
      );

      const rawText =
        res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      const parsed = this.safeParseJson(rawText);

      // Validate minimal shape; fallback if missing
      if (!parsed?.kpis || !parsed?.topActions || !parsed?.map) {
        return this.fallback(args.input);
      }

      return parsed as LlmSimulationResult;
    } catch (e) {
      // don’t crash your hackathon demo
      return this.fallback(args.input);
    }
  }

  private buildPrompt(input: any, weather: any) {
    const lat = input?.location?.lat;
    const lon = input?.location?.lon;

    return `
      You are a disaster response prediction engine.
      Return ONLY valid JSON (no markdown, no extra text). Output must follow this schema:
      
      {
        "map": {
          "center": {"lat": number, "lng": number},
          "zoom": number,
          "impactZones": [
            {
              "level": "HIGH" | "MEDIUM" | "LOW",
              "geometry": { "type": "Polygon", "coordinates": [[[lng,lat], ...]] }
            }
          ]
        },
        "kpis": {
          "householdsAffected": number,
          "roadBlockages": number,
          "sheltersNeeded": number
        },
        "topActions": [
          { "rank": 1, "title": string, "description": string, "icon": string, "priority": "LOW"|"MEDIUM"|"HIGH" }
        ],
        "plan": {
          "summary": string,
          "steps": [ { "title": string, "details": string } ]
        }
      }
      
      Rules:
      - Use provided input + weather to compute realistic values.
      - KPIs must be positive integers.
      - impactZones must be polygons around the provided coordinate.
      - topActions must contain exactly 3 items ranked 1..3.
      
      INPUT:
      ${JSON.stringify(input)}
      
      WEATHER (OpenWeather current):
      ${JSON.stringify(weather)}
      
      Coordinate center should be lat=${lat}, lon=${lon}.
      `;
  }

  private safeParseJson(text: string) {
    // Try to extract JSON block
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;

    try {
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }

  private fallback(input: any): LlmSimulationResult {
    const lat = Number(input?.location?.lat ?? 0);
    const lon = Number(input?.location?.lon ?? 0);

    const duration = Number(input?.duration ?? 1);
    const rain = Number(input?.rainfallIntensity ?? 0);
    const wind = Number(input?.windSpeed ?? 0);
    const mag = Number(input?.magnitude ?? 0);
    const fire = Number(input?.fireSpreadRate ?? 0);

    // quick severity
    const type = String(input?.disasterType ?? 'flood');
    const severity =
      type === 'flood'
        ? rain * duration
        : type === 'hurricane'
          ? wind * duration
          : type === 'earthquake'
            ? mag * 120
            : fire * duration;

    const householdsAffected = Math.max(50, Math.round(200 + severity * 4));
    const roadBlockages = Math.max(1, Math.round(5 + severity * 0.15));
    const sheltersNeeded = Math.max(100, Math.round(300 + severity * 6));

    const size = 0.01 + Math.min(0.05, severity / 20000);

    return {
      map: {
        center: { lat, lng: lon },
        zoom: 12,
        impactZones: [
          {
            level: 'HIGH',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [lon - size, lat + size],
                [lon + size, lat + size],
                [lon + size, lat - size],
                [lon - size, lat - size],
                [lon - size, lat + size],
              ]],
            },
          },
        ],
      },
      kpis: { householdsAffected, roadBlockages, sheltersNeeded },
      topActions: [
        {
          rank: 1,
          title: 'Deploy Emergency Services',
          description: 'Prioritize dispatch to high-impact zones',
          icon: 'SIREN',
          priority: 'HIGH',
        },
        {
          rank: 2,
          title: 'Establish Shelters',
          description: 'Activate designated public buildings',
          icon: 'HOME',
          priority: 'MEDIUM',
        },
        {
          rank: 3,
          title: 'Communicate Public Alerts',
          description: 'Issue targeted alerts and evacuation guidance',
          icon: 'RADIO',
          priority: 'MEDIUM',
        },
      ],
      plan: {
        summary: 'Fallback plan generated without AI (API key missing or AI output invalid).',
        steps: [
          { title: 'Assess risk', details: 'Review impacted areas and validate severity indicators.' },
          { title: 'Mobilize resources', details: 'Allocate teams and supplies based on impact zones.' },
          { title: 'Communicate', details: 'Send public alerts and update frequently.' },
        ],
      },
    };
  }
}
