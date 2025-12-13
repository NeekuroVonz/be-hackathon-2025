import { Injectable } from '@nestjs/common';

@Injectable()
export class AidService {
  // Hackathon: keep it static (you can later move to DB)
  private centers = [
    { id: '1', name: 'City Shelter A', lat: 10.78, lon: 106.66, address: 'Demo address 1', phone: '1900-xxxx' },
    { id: '2', name: 'Medical Point B', lat: 10.76, lon: 106.68, address: 'Demo address 2', phone: '1900-yyyy' },
  ];

  private tips: Record<string, string[]> = {
    flood: ['Move to higher ground.', 'Avoid driving through flooded roads.', 'Prepare clean water.'],
    storm: ['Secure loose objects.', 'Stay indoors during strong winds.', 'Charge devices and power banks.'],
    thunderstorm: ['Avoid tall trees and open fields.', 'Unplug sensitive electronics.', 'Monitor weather alerts.'],
    landslide: ['Avoid steep slopes during/after heavy rain.', 'Watch for cracks and unusual sounds.', 'Evacuate if warned.'],
    air: ['Wear a mask if air quality is poor.', 'Limit outdoor activity.', 'Use air purifier if available.'],
  };

  listCenters() {
    return this.centers;
  }

  getTips(disasterType?: string) {
    if (!disasterType) return this.tips;
    return this.tips[disasterType] ?? [];
  }
}
