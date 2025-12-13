import { BadRequestException, Injectable, InternalServerErrorException, } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WeatherService {
  private readonly apiKey =
    process.env.OPEN_WEATHER_API_KEY || process.env.WEATHER_API_KEY;

  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  async getCurrentWeatherByCoords(
    lat: number,
    lon: number,
    lang: string = 'en',
    units: 'metric' | 'imperial' | 'standard' = 'metric',
  ) {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'Missing OPENWEATHER_API_KEY (or WEATHER_API_KEY)',
      );
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new BadRequestException('Invalid lat/lon');
    }

    try {
      const res = await axios.get(`${this.baseUrl}/weather`, {
        params: { lat, lon, appid: this.apiKey, units, lang },
      });
      return res.data;
    } catch (err) {
      const e = err as AxiosError<any>;
      const status = e.response?.status;
      const message =
        e.response?.data?.message ||
        e.message ||
        'OpenWeather request failed';

      if (status && status >= 400 && status < 500) {
        throw new BadRequestException(message);
      }
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * Backward compatible method for older modules.
   * Accepts:
   *  - "lat,lon" string (preferred)
   *  - city name string (we will geocode using OpenWeather Geocoding API)
   */
  async getCurrentWeather(
    locationQuery: string,
    lang = 'en',
    units: 'metric' | 'imperial' | 'standard' = 'metric',
  ) {
    if (!this.apiKey) {
      throw new InternalServerErrorException(
        'Missing OPENWEATHER_API_KEY (or WEATHER_API_KEY)',
      );
    }

    const query = String(locationQuery || '').trim();
    if (!query) {
      throw new BadRequestException('locationQuery is required');
    }

    // "lat,lon" format
    const m = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (m) {
      return this.getCurrentWeatherByCoords(Number(m[1]), Number(m[2]), lang, units);
    }

    // City name -> geocode -> coords
    try {
      const geo = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
        params: { q: query, limit: 1, appid: this.apiKey },
      });
      const first = Array.isArray(geo.data) ? geo.data[0] : null;
      if (!first) {
        throw new BadRequestException(`Cannot geocode location: ${query}`);
      }
      return this.getCurrentWeatherByCoords(first.lat, first.lon, lang, units);
    } catch (err) {
      const e = err as AxiosError<any>;
      const message = e.response?.data?.message || e.message || 'Geocoding failed';
      throw new BadRequestException(message);
    }
  }

}
