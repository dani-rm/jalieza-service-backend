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
import { CatalogoOrden } from './../../catalogo_orden/entities/catalogo_orden.entity';

@Entity()
export class CatalogoServicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  service_name: string;

  @ManyToOne(() => CatalogoOrden, orden => orden.services, {
    onDelete: 'SET NULL',
    eager: true,
  })
  @JoinColumn({ name: 'orden_id' })
  order: CatalogoOrden;

  /* @Column({ nullable: false })
  description: string; */

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
