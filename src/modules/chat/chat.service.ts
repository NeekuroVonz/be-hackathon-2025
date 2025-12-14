import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { WeatherService } from '../weather/weather.service';
import { LlmService } from '../llm/llm.service';
import { ChatRequestDto, ChatResponseDto } from "./dto/chat.dto";

type ToolDecision =
  | { type: 'tool_call'; tool: 'get_weather'; args: { place: string } }
  | { type: 'final'; answer: string };

@Injectable()
export class ChatService {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly llmService: LlmService,
  ) {
  }

  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const lang = dto.lang ?? 'en';

    // Step 1: Ask Gemini whether it needs to call a tool (get_weather)
    const decision = (await this.llmService.generateJson(
      this.buildToolDecisionPrompt(dto.message, lang),
    )) as ToolDecision;

    // If model already answered without tool
    if (decision?.type === 'final' && decision.answer) {
      return { answer: decision.answer };
    }

    // If model requests weather
    if (
      decision?.type === 'tool_call' &&
      decision.tool === 'get_weather' &&
      decision.args?.place
    ) {
      const place = String(decision.args.place).trim();

      // Geocode with OpenWeather (tool execution)
      const geo = await this.weatherService.geocodeCity(place);

      if (!geo) {
        // Ask Gemini to ask user to clarify the location
        const clar = await this.llmService.generateJson(
          this.buildClarifyLocationPrompt(dto.message, place, lang),
        );
        return {
          answer:
            (clar as any)?.answer ??
            `I couldn't find "${place}". Please try a more specific name (e.g., "Hong Kong, HK").`,
        };
      }

      const weather = await this.weatherService.getCurrentWeatherByCoords(
        geo.lat,
        geo.lon,
        lang,
        'metric',
      );

      // Step 2: Provide tool result back to Gemini for final answer
      const finalJson = await this.llmService.generateJson(
        this.buildFinalAnswerPrompt(dto.message, geo.displayName ?? place, weather, lang),
      );

      return { answer: (finalJson as any)?.answer ?? 'No answer' };
    }

    // Fallback: if model output is invalid, use default location
    const { lat, lon, name } = this.getDefaultLocation();
    const weather = await this.weatherService.getCurrentWeatherByCoords(
      lat,
      lon,
      lang,
      'metric',
    );

    const finalJson = await this.llmService.generateJson(
      this.buildFinalAnswerPrompt(dto.message, name, weather, lang),
    );

    return { answer: (finalJson as any)?.answer ?? 'No answer' };
  }

  private getDefaultLocation() {
    const lat = Number(process.env.DEFAULT_WEATHER_LAT);
    const lon = Number(process.env.DEFAULT_WEATHER_LON);
    const name = process.env.DEFAULT_WEATHER_NAME || 'your area';

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new InternalServerErrorException(
        'Missing DEFAULT_WEATHER_LAT/DEFAULT_WEATHER_LON in .env',
      );
    }
    return { lat, lon, name };
  }

  private buildToolDecisionPrompt(message: string, lang: string) {
    return `
      You are a tool-using assistant.
      
      User message:
      ${message}
      
      Decide if you need current weather data for a specific place to answer.
      Return ONLY valid JSON and nothing else.
      
      If the user asks for weather/temperature/rain/wind in a specific place, call the tool:
      {
        "type": "tool_call",
        "tool": "get_weather",
        "args": { "place": "<place name>" }
      }
      
      If the user did NOT specify a place, do NOT call tool. Ask a follow-up question:
      {
        "type": "final",
        "answer": "<ask user which city/country, in ${lang}>"
      }
      
      If the user is NOT asking about weather at all, answer normally:
      {
        "type": "final",
        "answer": "<answer in ${lang}>"
      }
    `.trim();
  }

  private buildFinalAnswerPrompt(
    originalMessage: string,
    placeResolved: string,
    weather: any,
    lang: string,
  ) {
    return `
      You are a friendly weather assistant.
      
      Rules:
      - Answer in ${lang}.
      - The location is: ${placeResolved}.
      - Use ONLY the OpenWeather JSON provided (current conditions).
      - Summarize condition, temperature, rain (if any), wind.
      - If user asks about forecast, say you only have current conditions (no forecast).
      - Give practical advice briefly.
      
      User message:
      ${originalMessage}
      
      OpenWeather current weather JSON:
      ${JSON.stringify(weather)}
      
      Return ONLY JSON:
      { "answer": "..." }
      `.trim();
  }

  private buildClarifyLocationPrompt(message: string, place: string, lang: string) {
    return `
      You are a helpful assistant.
      
      The user asked:
      ${message}
      
      We attempted to resolve the place "${place}" but failed.
      
      Return ONLY JSON:
      { "answer": "<ask user to rephrase location more specifically, in ${lang}>" }
    `.trim();
  }
}
