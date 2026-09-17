import { Injectable } from '@nestjs/common';
import { CreatePromoDto } from './dto/create-promo.dto';

export interface Promo {
  id: string;
  titulo: string;
  descuento: number;
}

const SEED_PROMOS: Promo[] = [
  { id: 'PROMO-101', titulo: 'Semana de descuentos', descuento: 15 },
  { id: 'PROMO-102', titulo: 'Liquidación de invierno', descuento: 30 },
];

@Injectable()
export class PromosService {
  list(): Promo[] {
    return SEED_PROMOS;
  }

  detail(id: string): Promo {
    return SEED_PROMOS.find((p) => p.id === id) ?? { id, titulo: 'Promo sin detalle', descuento: 0 };
  }

  create(dto: CreatePromoDto): Promo {
    const id = `PROMO-${Math.floor(100 + Math.random() * 900)}`;
    return { id, titulo: dto.titulo, descuento: dto.descuento };
  }
}