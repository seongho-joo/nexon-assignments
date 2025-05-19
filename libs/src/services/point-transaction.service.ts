import { Injectable } from '@nestjs/common';
import { CustomLoggerService } from '@app/common/logger';
import { PointTransactionRepository } from '@app/common/repositories/point-transaction.repository';
import { PointTransaction } from '@app/common/schemas';
import { Types } from 'mongoose';

@Injectable()
export class PointTransactionService {
  constructor(
    private readonly pointTransactionRepository: PointTransactionRepository,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('PointTransactionService');
  }

  async findTransactionsByUserId(userId: string): Promise<{ transactions: PointTransaction[]; totalCount: number }> {
    const [transactions, totalCount] = await Promise.all([
      this.pointTransactionRepository.findByUserId(userId),
      this.pointTransactionRepository.countByUserId(userId),
    ]);

    return { transactions, totalCount };
  }
} 