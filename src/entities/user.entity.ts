import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProfileEntity } from '@entities/profile.entity';
import { AddressEntity } from '@entities/address.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255 })
  app_id: string;

  @Column({ type: 'varchar', length: 255 })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'bit' })
  first_login: boolean;

  @Column({ type: 'timestamp' })
  last_active: Date;

  @Column({ type: 'varchar', length: 255 })
  provider: string;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @OneToMany(() => ProfileEntity, (profile) => profile.user)
  profiles: ProfileEntity[];

  @OneToMany(() => AddressEntity, (address) => address.user)
  address: AddressEntity[];
}
