import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WeatherService {
  private readonly apiKey = process.env.WEATHER_API_KEY;
  private readonly baseUrl = 'http://api.weatherapi.com/v1';

  /**
   * Get current weather for a given location query.
   * @param locationQuery Location string (city, "lat,lon", zip, etc.)
   * @param lang Language code as supported by WeatherAPI (e.g. "en", "vi").
   */
  async getCurrentWeather(locationQuery: string, lang: string = 'en') {
    const allowedLangs = [
      'ar',
      'bn',
      'bg',
      'zh',
      'zh_tw',
      'cs',
      'da',
      'nl',
      'fi',
      'fr',
      'de',
      'el',
      'hi',
      'hu',
      'it',
      'ja',
      'jv',
      'ko',
      'zh_cmn',
      'mr',
      'pl',
      'pt',
      'pa',
      'ro',
      'ru',
      'sr',
      'si',
      'sk',
      'es',
      'sv',
      'ta',
      'te',
      'tr',
      'uk',
      'ur',
      'vi',
      'zh_wuu',
      'zh_hsn',
      'zh_yue',
      'zu',
      'en',
    ];

    const safeLang = allowedLangs.includes(lang) ? lang : 'en';

    const url = `${this.baseUrl}/forecast.json?key=${this.apiKey}&q=${encodeURIComponent(
      locationQuery,
    )}&lang=${safeLang}&days=1&aqi=yes&alerts=yes`;

    const res = await axios.get(url);
    return res.data;
  }
}
