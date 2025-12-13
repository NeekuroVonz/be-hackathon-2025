import { BadRequestException, Injectable } from '@nestjs/common';
import { ScenarioService } from '../scenario/scenario.service';
import { WeatherService } from '../weather/weather.service';
import { LlmService } from '../llm/llm.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly scenarioService: ScenarioService,
    private readonly weatherService: WeatherService,
    private readonly llmService: LlmService,
  ) {
  }

  async chat(input: {
    message: string;
    lang?: string;
    scenarioId?: string;
    locationName?: string;
  }) {
    const lang = input.lang ?? 'en';

    let context: any = {};
    let locationName = input.locationName;

    if (input.scenarioId) {
      const sc = await this.scenarioService.getScenario(input.scenarioId);
      locationName = sc.locationName;

      context = {
        scenarioId: sc.scenarioId,
        locationName: sc.locationName,
        lang: sc.lang,
        weather: sc.weatherJson,
        analysis: sc.analysisJson,
        resources: sc.resourcesJson,
        plan: sc.planJson,
        simulation: sc.simulationJson,
      };
    } else {
      if (!locationName) {
        throw new BadRequestException(
          'Provide either scenarioId or locationName',
        );
      }
      const weather = await this.weatherService.getCurrentWeather(
        locationName,
        lang,
      );
      context = {
        scenarioId: null,
        locationName,
        lang,
        weather,
      };
    }

    // A simple "chat" prompt that uses scenario/prediction context
    const prompt = `
      You are a helpful disaster-preparedness assistant for a hackathon demo.
      
      User selected lang="${lang}". Respond in that language.
      
      You MUST:
      - Keep the answer concise and actionable.
      - If the user asks for recommendations, provide a short list of steps.
      - If the user asks about risk, use the provided analysis if available.
      - If analysis/resources/plan are missing, infer carefully from weather and say it's a simulation.
      
      Context JSON:
      ${JSON.stringify(context, null, 2)}
      
      User question:
      "${input.message}"
      
      Return PURE JSON ONLY (no markdown) with schema:
      
      {
        "answer": "string",
        "suggestedActions": ["string", "string"],
        "relatedScenarioId": "string | null"
      }
    `;

    // Reuse your current LLM call pattern but for generic JSON responses
    const result = await this.llmService.generateJson(prompt);

    return {
      ...result,
      relatedScenarioId: input.scenarioId ?? null,
      locationName,
      lang,
    };
  }
}
