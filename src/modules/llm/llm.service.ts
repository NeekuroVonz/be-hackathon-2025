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

  async decideWeatherToolCall(input: { message: string; lang: string }) {
    const prompt = `
      You are a tool-using assistant.
      
      User message:
      ${input.message}
      
      Decide if you need current weather data for a specific place to answer.
      If yes, request tool call.
      
      Return ONLY valid JSON in ONE of these forms:
      
      1) Tool call:
      { "type": "tool_call", "tool": "get_weather", "args": { "place": "<city/country>", "lang": "${input.lang}" } }
      
      2) Final answer (no tool needed):
      { "type": "final", "answer": "<answer in ${input.lang}>" }
      
      Rules:
      - If user asks "weather in X" or "temperature in X" or "is it raining in X", you MUST call the tool.
      - The place must be a human-readable string (e.g., "Hong Kong", "Paris, FR", "Ho Chi Minh City").
      - If user doesn't specify a place, ask a follow-up as final answer (no tool call).
    `;

    const json = await this.generateJson(prompt);
    return json as { type: 'tool_call' | 'final'; tool?: string; args?: any; answer?: string };
  }

  async finalizeWithWeatherTool(input: {
    originalMessage: string;
    lang: string;
    placeResolved: string;
    weather: any;
  }) {
    const prompt = `
      You are a friendly weather assistant.
      
      You have tool output (current weather) for: ${input.placeResolved}
      
      User question:
      ${input.originalMessage}
      
      OpenWeather current weather JSON:
      ${JSON.stringify(input.weather)}
      
      Return ONLY JSON:
      { "answer": "<answer in ${input.lang}>" }
      
      Guidelines:
      - Mention the resolved place name.
      - Summarize: condition, temperature, rain (if any), wind.
      - Give practical advice if relevant (umbrella, heat, driving).
      - If user asks about forecast, say you only have current conditions.
    `;

    const json = await this.generateJson(prompt);
    return json as { answer: string };
  }

  // Your existing "generateJson" should call your model and parse JSON.
  // Keep it, but ensure it strips ```json fences.
  async generateJson(prompt: string) {
    if (!this.geminiApiKey) {
      // minimal hackathon fallback
      return { type: 'final', answer: 'LLM key missing.' };
    }

    const res = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      { contents: [{ parts: [{ text: prompt }] }] },
      { params: { key: this.geminiApiKey } },
    );

    const rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = String(rawText).replace(/```json/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    const jsonText = match ? match[0] : cleaned;

    return JSON.parse(jsonText);
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
    languages?: string[];
  }): Promise<LlmSimulationResult> {
    // If no API key, still return dynamic-ish fallback (hackathon safe)
    if (!this.geminiApiKey) {
      return this.fallback(args.input);
    }

    const prompt = this.buildPrompt(args.input, args.weather, args.languages ?? ['en']);

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

  private buildPrompt(input: any, weather: any, languages: string[] = ['en']) {
    const lat = Number(input?.location?.lat ?? 0);
    const lon = Number(input?.location?.lon ?? 0);
    const displayName =
      input?.location?.displayName || input?.location?.name || 'Unknown location';
    const languageList = languages.join(', ');

    return `
      You are an emergency-management AI that simulates and predicts flood impacts for a location.
      
      CRITICAL OUTPUT RULES:
      - Return ONLY valid JSON.
      - No markdown, no explanation, no extra text.
      - All numbers must be real numbers (no NaN), and KPI values must be integers.
      - You must return exactly 3 topActions with rank 1..3.
      - You must generate at least 2 impactZones (HIGH and MEDIUM at minimum).
      - impactZones must be polygons around the given coordinate. Coordinates are [lng, lat].
      - The "forecastHours" in floodPrediction must equal input.duration.
      - If rainfallIntensity is null or 0 but weather shows rain, infer rainfallIntensity from weather.
      
      TASK:
      Given the user input + current weather, simulate an UPCOMING FLOOD event over the next input.duration hours.
      Predict:
      1) flood probability, severity, and time-to-impact,
      2) affected zones (polygons),
      3) key impacts (households affected, road blockages, shelters needed),
      4) top response actions,
      5) a structured response plan.
      
      OUTPUT JSON SCHEMA (must match exactly):
      {
        "floodPrediction": {
          "locationName": string,
          "forecastHours": number,
          "probability": number,               // 0..1
          "severity": "LOW"|"MEDIUM"|"HIGH",
          "timeToImpactHours": number,         // 0..forecastHours (can be 0 if immediate)
          "mainDrivers": string[]              // e.g. ["High rainfall intensity", "Saturated ground", "Low elevation (assumed)"]
        },
        "map": {
          "center": {"lat": number, "lng": number},
          "zoom": number,
          "impactZones": [
            {
              "level": "HIGH"|"MEDIUM"|"LOW",
              "label": string,
              "geometry": { "type": "Polygon", "coordinates": [[[lng,lat],...]] }
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
          "assumptions": string[],
          "steps": [
            { "phase": "NOW"|"NEXT_6_HOURS"|"NEXT_12_HOURS"|"NEXT_24_HOURS",
              "title": string,
              "details": string
            }
          ],
          "evacuationGuidance": {
            "trigger": string,
            "priorityAreas": string[],
            "publicMessage": string
          }
        }
      }
      
      COMPUTATION GUIDELINES:
      - Use rainfallIntensity (mm/hr) and duration (hours) as primary drivers.
      - Use weather.current (rain, clouds, humidity, wind, pressure) to adjust probability.
      - Simple severity heuristic:
        - totalRain = rainfallIntensity * duration
        - If totalRain >= 200 => HIGH, 80..199 => MEDIUM, <80 => LOW
      - Probability heuristic:
        - Start at 0.25
        - Add +0.25 if rainfallIntensity >= 20
        - Add +0.20 if rainfallIntensity >= 35
        - Add +0.15 if duration >= 12
        - Add +0.10 if weather indicates rain (any rain volume or "rain" condition)
        - Clamp to 0..0.98
      - timeToImpactHours:
        - If rainfallIntensity >= 35 => 0..2
        - If rainfallIntensity 20..34 => 2..6
        - else => 6..forecastHours
      - KPIs scale with severity and totalRain. Must be integers and plausible.
      - impactZones:
        - Create polygons around center with radius depending on severity:
          HIGH: ~2–6 km, MEDIUM: ~1–3 km, LOW: ~0.5–1.5 km (convert to degrees approx: 1km ~ 0.009 lat)
        - Provide at least 2 zones: HIGH and MEDIUM. Add LOW if you can.
      
      CONTEXT:
      User input:
      ${JSON.stringify(input)}
      
      Current weather from OpenWeather:
      ${JSON.stringify(weather)}
      
      Known coordinate center:
      lat=${lat}, lon=${lon}, displayName="${displayName}"
      
      OUTPUT LANGUAGES:
      Generate all text content (titles, descriptions, summaries, public messages, etc.) in these languages: ${languageList}
      If multiple languages are specified, use the first language as the primary output language.
      
      Now return ONLY the JSON object.
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
