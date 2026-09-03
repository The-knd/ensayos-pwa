import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Client, ClientStatus } from './entities/client.entity';
import { ClientDirection, ClientDirectionType } from './entities/client-direction.entity';
import { ClientReference } from './entities/client-reference.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private repo: Repository<Client>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  findAll(companyId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.repo.findAndCount({
      where: { companyId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string) {
    const client = await this.repo.findOne({
      where: { id, companyId },
      relations: ['directions', 'references'],
    });
    if (!client) throw new NotFoundException();
    return client;
  }

  async create(companyId: string, dto: CreateClientDto) {
    const { directions, references, ...rest } = dto;
    return this.dataSource.transaction(async (manager) => {
      const client = await manager.save(manager.create(Client, { ...rest, companyId }));

      if (Array.isArray(directions) && directions.length > 0) {
        await manager.save(
          ClientDirection,
          directions.map((d) =>
            manager.create(ClientDirection, {
              companyId,
              client,
              type: d.kind === 'despacho' ? ClientDirectionType.DESPACHO : ClientDirectionType.PRINCIPAL,
              address: d.address,
              department: d.department,
              city: d.city,
              postalCode: d.postalCode,
              phone: d.phone,
              contactFirstName: d.contactFirstName,
              contactSecondName: d.contactSecondName,
              contactFirstLastName: d.contactFirstLastName,
              contactSecondLastName: d.contactSecondLastName,
              description: d.description,
            }),
          ),
        );
      }

      if (Array.isArray(references) && references.length > 0) {
        await manager.save(
          ClientReference,
          references.map((r, idx) =>
            manager.create(ClientReference, {
              companyId,
              client,
              sequence: idx + 1,
              entity: r.entity,
              address: r.address,
              department: r.department,
              city: r.city,
              phone: r.phone,
              creditLimit: r.creditLimit,
            }),
          ),
        );
      }

      return this.findOne(client.id, companyId);
    });
  }

  async update(id: string, companyId: string, dto: UpdateClientDto) {
    const client = await this.repo.findOne({ where: { id, companyId } });
    if (!client) throw new NotFoundException();
    Object.assign(client, dto);
    return this.repo.save(client);
  }

  async toggleStatus(id: string, companyId: string) {
    const client = await this.repo.findOne({ where: { id, companyId } });
    if (!client) throw new NotFoundException();
    client.status = client.status === ClientStatus.ACTIVE ? ClientStatus.INACTIVE : ClientStatus.ACTIVE;
    return this.repo.save(client);
  }
}