import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credit, CreditStatus } from './entities/credit.entity';
import { CreditDocument } from './entities/credit-document.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateCreditDto } from './dto/create-credit.dto';
import { StudyCreditDto } from './dto/study-credit.dto';
import { CreditResultDto } from './dto/credit-result.dto';

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(Credit) private repo: Repository<Credit>,
    @InjectRepository(CreditDocument) private docsRepo: Repository<CreditDocument>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
  ) {}

  findAll(companyId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.repo.findAndCount({
      where: { companyId },
      relations: ['client'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, companyId: string) {
    const credit = await this.repo.findOne({
      where: { id, companyId },
      relations: ['client', 'documents'],
    });
    if (!credit) throw new NotFoundException('Crédito no encontrado');
    return credit;
  }

  async create(companyId: string, dto: CreateCreditDto) {
    await this.ensureClientInTenant(dto.clientId, companyId);
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  async study(companyId: string, dto: StudyCreditDto) {
    const client = await this.ensureClientInTenant(dto.clientId, companyId);
    const credit = await this.repo.save(
      this.repo.create({
        companyId,
        clientId: dto.clientId,
        requestedAmount: dto.requestedAmount ?? 0,
        nit: dto.nit ?? client.documentNumber,
        consentData: dto.consentData ?? false,
        monthlyIncome: dto.monthlyIncome,
        monthlyExpenses: dto.monthlyExpenses,
        assetsValue: dto.assetsValue,
        liabilitiesValue: dto.liabilitiesValue,
        foundationDate: dto.foundationDate,
        status: CreditStatus.IN_STUDY,
      }),
    );
    return this.findOne(credit.id, companyId);
  }

  async result(id: string, companyId: string, dto: CreditResultDto) {
    const credit = await this.findOne(id, companyId);
    if (dto.decision === 'approved') {
      credit.status = CreditStatus.APPROVED;
      credit.approvedLimit = dto.approvedLimit ?? credit.requestedAmount;
      if (!credit.applicationNumber) {
        credit.applicationNumber = this.generateApplicationNumber(credit.id);
      }
    } else {
      credit.status = CreditStatus.REJECTED;
    }
    return this.repo.save(credit);
  }

  async sign(id: string, companyId: string) {
    const credit = await this.findOne(id, companyId);
    if (credit.status !== CreditStatus.APPROVED) {
      throw new BadRequestException('El crédito debe estar aprobado para firmar el pagaré');
    }
    credit.status = CreditStatus.SIGNED;
    credit.signatureDate = new Date();
    await this.repo.save(credit);

    await this.docsRepo.save([
      this.docsRepo.create({
        companyId,
        creditId: credit.id,
        code: 'pagare',
        name: 'Pagaré firmado',
        status: 'signed',
        signedAt: credit.signatureDate,
      }),
      this.docsRepo.create({
        companyId,
        creditId: credit.id,
        code: 'carta_instrucciones',
        name: 'Carta de instrucciones',
        status: 'signed',
        signedAt: credit.signatureDate,
      }),
    ]);

    return this.findOne(credit.id, companyId);
  }

  async finalize(id: string, companyId: string) {
    const credit = await this.findOne(id, companyId);
    if (credit.status !== CreditStatus.SIGNED) {
      throw new BadRequestException('El crédito debe estar firmado para desembolsar');
    }
    credit.status = CreditStatus.DISBURSED;
    credit.disbursementDate = new Date();
    await this.repo.save(credit);

    await this.docsRepo.save(
      this.docsRepo.create({
        companyId,
        creditId: credit.id,
        code: 'comprobante_desembolso',
        name: 'Comprobante de desembolso',
        status: 'issued',
      }),
    );

    return this.findOne(credit.id, companyId);
  }

  listDocuments(id: string, companyId: string) {
    return this.docsRepo.find({ where: { creditId: id, companyId }, order: { createdAt: 'ASC' } });
  }

  async updateStatus(id: string, companyId: string, status: CreditStatus) {
    const credit = await this.findOne(id, companyId);
    credit.status = status;
    return this.repo.save(credit);
  }

  private async ensureClientInTenant(clientId: string, companyId: string) {
    const client = await this.clientRepo.findOne({ where: { id: clientId, companyId } });
    if (!client) throw new NotFoundException('Cliente no encontrado en esta empresa');
    return client;
  }

  private generateApplicationNumber(creditId: string): string {
    return `IF-${creditId.replace(/-/g, '').slice(-5).toUpperCase()}`;
  }
}