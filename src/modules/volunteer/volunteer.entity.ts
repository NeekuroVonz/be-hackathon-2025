import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'mdm_volunteer' })
export class Volunteer {
  @PrimaryGeneratedColumn('uuid', { name: 'volunteer_id' })
  volunteerId: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'phone', type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ name: 'skills', type: 'varchar', length: 255, nullable: true })
  skills: string | null;

  @Column({ name: 'lat', type: 'float', nullable: true })
  lat: number | null;

  @Column({ name: 'lon', type: 'float', nullable: true })
  lon: number | null;

  @Column({ name: 'cre_dt', type: 'timestamptz', default: () => 'now()' })
  creDt: Date;
}
