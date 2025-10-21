import { CatalogoServicio } from "src/catalogo_servicios/entities/catalogo_servicio.entity";
import { Ciudadanos } from "src/ciudadanos/entities/ciudadano.entity";
import { ServiceStatus } from "../enums/service-status.enum";
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
export class ServiciosCiudadano {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Ciudadanos, ciudadano => ciudadano.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ciudadano_id' })
  citizen: Ciudadanos;

  @ManyToOne(() => CatalogoServicio, { eager: true }) // Puedes poner eager: true o false
    
  @JoinColumn({ name: 'service_id' }) // 👈 Usa el mismo nombre que el campo existente
  catalogoServicio: CatalogoServicio;

  @Column({ nullable: true })
  start_date: Date;

  /* @Column({ type: 'date', nullable: true })
  rest_period_end: Date; // o descanso_termina_en si prefieres en español */

  @Column({ nullable: true })
  end_date: Date;

  @Column({
    nullable: true,
    type: 'enum',
    enum: ServiceStatus,
    default: ServiceStatus.completed,
  })
  service_status: ServiceStatus;

  @Column({ nullable: true })
  observations: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
