import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WeatherService } from '../weather/weather.service';
import { LlmService } from '../llm/llm.service';
import { PredictDisasterDto } from './dto/predict-disaster.dto';

@ApiTags('Disaster')
@Controller('disaster')
export class DisasterController {
  constructor(
    private readonly weatherService: WeatherService,
    private readonly llmService: LlmService,
  ) {}

  @ApiOperation({ summary: 'Predict disaster risk for a location' })
  @Post('predict')
  @HttpCode(HttpStatus.OK)
  async predict(@Body() body: PredictDisasterDto) {
    try {
      const lang = body.lang ?? 'en';

      // 1) Fetch weather using selected language
      const weather = await this.weatherService.getCurrentWeather(
        body.locationName,
        lang,
      );

      // 2) Call LLM (Gemini), you can also pass lang if you want different language in explanation
      const analysis = await this.llmService.analyzeDisasterRisk(
        body.locationName,
        weather,
        lang, // optional: use it in prompt if you want
      );

      return {
        location: body.locationName,
        lang,
        weatherSummary: {
          tempC: weather.current?.temp_c,
          tempF: weather.current?.temp_f,
          condition: weather.current?.condition?.text, // now localized
          windKph: weather.current?.wind_kph,
          humidity: weather.current?.humidity,
          feelsLikeC: weather.current?.feelslike_c,
          lastUpdated: weather.current?.last_updated,
        },
        analysis,
      };
    } catch (error: any) {
      return {
        error: true,
        message:
          error?.response?.data?.error?.message ||
          error?.message ||
          'Failed to predict disaster risk',
      };
    }
  }
}
