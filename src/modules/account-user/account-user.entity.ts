import { Column, Entity, PrimaryGeneratedColumn, } from 'typeorm';

@Entity({ name: 'mdm_account_user' })
export class AccountUser {
  @PrimaryGeneratedColumn('uuid', { name: 'usr_id' })
  usrId: string;

  @Column({ name: 'username', length: 255, unique: true })
  username: string;

  @Column({ name: 'password', length: 255 })
  password: string;

  @Column({ name: 'cre_usr_id', length: 100, nullable: true })
  creUsrId: string | null;

  @Column({
    name: 'cre_dt',
    type: 'timestamptz',
    default: () => 'now()',
  })
  creDt: Date;

  @Column({ name: 'upd_usr_id', length: 100, nullable: true })
  updUsrId: string | null;

  @Column({
    name: 'upd_dt',
    type: 'timestamptz',
    default: () => 'now()',
  })
  updDt: Date;
}
