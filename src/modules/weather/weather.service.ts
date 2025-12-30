import { BadRequestException, Injectable, InternalServerErrorException, } from '@nestjs/common';
import axios, { AxiosError } from 'axios';

@Injectable()
export class WeatherService {
  private readonly apiKey =
    process.env.OPEN_WEATHER_API_KEY || process.env.WEATHER_API_KEY;

  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  // Simple in-memory cache for weather data (TTL: 5 minutes, max 100 entries)
  private readonly weatherCache = new Map<string, { data: any; expiry: number }>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly CACHE_MAX_SIZE = 100; // Maximum cache entries
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  private getCacheKey(lat: number, lon: number, lang: string, units: string): string {
    return `${lat.toFixed(4)},${lon.toFixed(4)},${lang},${units}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.weatherCache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    // Clean up expired entry
    if (cached) {
      this.weatherCache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    // Evict oldest entries if cache is full
    if (this.weatherCache.size >= this.CACHE_MAX_SIZE) {
      const now = Date.now();
      // First, remove expired entries
      for (const [k, v] of this.weatherCache) {
        if (v.expiry <= now) {
          this.weatherCache.delete(k);
        }
      }
      // If still full, remove the oldest entry
      if (this.weatherCache.size >= this.CACHE_MAX_SIZE) {
        const oldestKey = this.weatherCache.keys().next().value;
        if (oldestKey) {
          this.weatherCache.delete(oldestKey);
        }
      }
    }
    this.weatherCache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL_MS,
    });
  }

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

    // Check cache first
    const cacheKey = this.getCacheKey(lat, lon, lang, units);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const res = await axios.get(`${this.baseUrl}/weather`, {
        params: { lat, lon, appid: this.apiKey, units, lang },
        timeout: this.REQUEST_TIMEOUT_MS,
      });
      // Cache the result
      this.setCache(cacheKey, res.data);
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
        timeout: this.REQUEST_TIMEOUT_MS,
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

  async geocodeCity(query: string) {
    const res = await axios.get('https://api.openweathermap.org/geo/1.0/direct', {
      params: { q: query, limit: 1, appid: this.apiKey },
      timeout: this.REQUEST_TIMEOUT_MS,
    });
    const first = Array.isArray(res.data) ? res.data[0] : null;
    if (!first) return null;

    const displayName = [first.name, first.state, first.country]
      .filter(Boolean)
      .join(', ');

    return { lat: first.lat, lon: first.lon, displayName };
  }
}
