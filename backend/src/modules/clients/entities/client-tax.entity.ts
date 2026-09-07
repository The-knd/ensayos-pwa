import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../commons/entities/base.entity';
import { Client } from './client.entity';

@Entity('client_tax_settings')
export class ClientTaxSettings extends BaseEntity {
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'client_id', unique: true })
  clientId: string;

  @OneToOne(() => Client, (c) => c.taxSettings)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  // Régimen del cliente
  @Column({ name: 'regimen_responsable_iva', default: false })
  regimenResponsableIva: boolean;

  @Column({ name: 'regimen_simplificado', default: false })
  regimenSimplificado: boolean;

  @Column({ name: 'gran_contribuyente', default: false })
  granContribuyente: boolean;

  @Column({ name: 'autorretenedor', default: false })
  autorretenedor: boolean;

  // Impuestos
  @Column({ name: 'iva_19', default: false })
  iva19: boolean;

  @Column({ name: 'iva_5', default: false })
  iva5: boolean;

  @Column({ name: 'iva_exento_excluido', default: false })
  ivaExentoExcluido: boolean;

  @Column({ name: 'inc', default: false })
  inc: boolean;

  @Column({ name: 'ica_sujeto', default: false })
  icaSujeto: boolean;

  @Column({ name: 'gmf_sujeto', default: false })
  gmfSujeto: boolean;

  @Column({ name: 'timbre_sujeto', default: false })
  timbreSujeto: boolean;

  // Retención en la fuente a título de renta
  @Column({ name: 'rtefuente_honorarios', default: false })
  rtefuenteHonorarios: boolean;

  @Column({ name: 'rtefuente_servicios', default: false })
  rtefuenteServicios: boolean;

  @Column({ name: 'rtefuente_compras', default: false })
  rtefuenteCompras: boolean;

  @Column({ name: 'rtefuente_arrendamiento', default: false })
  rtefuenteArrendamiento: boolean;

  @Column({ name: 'rtefuente_transporte', default: false })
  rtefuenteTransporte: boolean;

  @Column({ name: 'rtefuente_intereses', default: false })
  rtefuenteIntereses: boolean;

  @Column({ name: 'rtefuente_dividendos', default: false })
  rtefuenteDividendos: boolean;

  // Retención de IVA
  @Column({ name: 'reteiva_15', default: false })
  reteiva15: boolean;

  @Column({ name: 'reteiva_50', default: false })
  reteiva50: boolean;

  @Column({ name: 'reteiva_100', default: false })
  reteiva100: boolean;

  // Retenciones varias
  @Column({ name: 'reteica', default: false })
  reteica: boolean;

  @Column({ name: 'retencion_timbre', default: false })
  retencionTimbre: boolean;

  @Column({ name: 'retencion_gmf', default: false })
  retencionGmf: boolean;

  @Column({ name: 'autorretencion_fuente', default: false })
  autorretencionFuente: boolean;

  @Column({ name: 'autorretencion_ica', default: false })
  autorretencionIca: boolean;
}