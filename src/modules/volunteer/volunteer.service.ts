import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Volunteer } from './volunteer.entity';

@Injectable()
export class VolunteerService {
  constructor(
    @InjectRepository(Volunteer)
    private readonly repo: Repository<Volunteer>,
  ) {
  }

  create(input: Partial<Volunteer>) {
    const v = this.repo.create({
      name: input.name!,
      phone: input.phone ?? null,
      skills: input.skills ?? null,
      lat: input.lat ?? null,
      lon: input.lon ?? null,
    });
    return this.repo.save(v);
  }

  list(near?: { lat: number; lon: number }) {
    // Hackathon-simple: return all if no near filter
    return this.repo.find({ order: { creDt: 'DESC' } });
  }
}
