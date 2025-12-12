import { ApiProperty } from '@nestjs/swagger';

export class PredictDisasterDto {
  @ApiProperty({
    example: 'Ho Chi Minh City',
    description:
      'Location name or query string supported by WeatherAPI (e.g. city, lat,long, zip).',
  })
  locationName: string;

  @ApiProperty({
    example: 'vi',
    required: false,
    description:
      'Language code for WeatherAPI condition text (e.g. "en", "vi", "fr"). Defaults to "en" if not provided.',
  })
  lang?: string;
}
