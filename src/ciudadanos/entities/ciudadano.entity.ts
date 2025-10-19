import { ServiciosCiudadano } from 'src/servicios_ciudadanos/entities/servicios_ciudadano.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MaritalStatus } from '../enums/marital-status.enum';

@Entity()
export class Ciudadanos {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: false })
  last_name_father: string;

  @Column({ nullable: true })
  last_name_mother: string;

  @Column({ nullable: true })
  comment: string;

  @Column({ type: 'date', nullable: true })
  birth_date: Date;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'int', nullable: false })
  marital_status: MaritalStatus;

  // ✅ NUEVO: Campo simple para control de órdenes
  @Column({ type: 'integer', default: 1 })
  max_orden_desbloqueada: number; // Solo guardamos hasta qué orden puede acceder

  @ManyToOne(() => Ciudadanos, (citizen) => citizen.partners, {
    nullable: true,
  })
  @JoinColumn({ name: 'partner_id' })
  partner: Ciudadanos;

  @OneToMany(() => Ciudadanos, (citizen) => citizen.partner, { nullable: true })
  partners: Ciudadanos[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @OneToMany(() => ServiciosCiudadano, (service) => service.citizen, {
    nullable: true,
  })
  services: ServiciosCiudadano[];

}
