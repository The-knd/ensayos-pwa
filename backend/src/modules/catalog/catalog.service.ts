import { Injectable } from '@nestjs/common';
import { CatalogItemDto } from './dto/catalog-item.dto';

export interface CatalogItem {
  sku: string;
  nombre: string;
  precio: number;
}

const SEED_ITEMS: CatalogItem[] = [
  { sku: 'CAT-001', nombre: 'Martillo 500g', precio: 12500 },
  { sku: 'CAT-002', nombre: 'Pinza universal', precio: 8900 },
  { sku: 'CAT-003', nombre: 'Cinta métrica 5m', precio: 4200 },
];

@Injectable()
export class CatalogService {
  list(): CatalogItem[] {
    return SEED_ITEMS;
  }

  add(dto: CatalogItemDto): CatalogItem {
    return { sku: dto.sku, nombre: dto.nombre, precio: dto.precio };
  }
}