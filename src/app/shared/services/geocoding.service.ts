import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  private API_KEY = 'MzgYi19w8vOacBZjrnJe';

  constructor(private http: HttpClient) {}

  async geocode(address: string): Promise<GeoCoordinate | null> {
    if (!address) return null;

    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=${this.API_KEY}&limit=1`;

    try {
      const res: any = await firstValueFrom(this.http.get(url));

      if (res && res.features && res.features.length > 0) {
        const result = res.features[0];
        return {
          lat: result.geometry.coordinates[1],
          lng: result.geometry.coordinates[0],
          displayName: result.place_name
        };
      }

      return null;

    } catch (error) {
      console.error("❌ Error geocoding:", error);
      return null;
    }
  }
}
