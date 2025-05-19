import { Controller, HttpStatus } from '@nestjs/common';
import { MessagePattern, RpcException } from '@nestjs/microservices';
import { CustomLoggerService } from '@app/common/logger';
import { PointTransactionService } from '@app/common/services/point-transaction.service';
import { BaseResponseDto, GatewayCommandEnum } from '@app/common/dto';
import { plainToClass } from 'class-transformer';
import { BadRequestException, NotFoundException } from '@app/common/exceptions';
import {
  PointTransactionListResponseDto,
  PointTransactionResponseDto,
} from '@app/common/dto/point-transaction';

interface ProxyPayload {
  body: unknown;
  query: unknown;
  params: unknown;
  headers: Record<string, unknown>;
}

@Controller()
export class PointTransactionGateway {
  constructor(
    private readonly pointTransactionService: PointTransactionService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('PointTransactionGateway');
  }

  @MessagePattern({ cmd: GatewayCommandEnum.POINT_TRANSACTION })
  async handleRequest(data: {
    path: string;
    method: string;
    body: ProxyPayload;
  }): Promise<BaseResponseDto<unknown>> {
    this.logger.log(`Received proxy request for path: ${data.path}, method: ${data.method}`);

    // GET /users/:userId/point-transactions
    const userTransactionsMatch = data.path.match(/^users\/([^/]+)\/point-transactions$/);
    if (userTransactionsMatch && data.method === 'GET') {
      const userId = userTransactionsMatch[1];
      return this.handleGetUserTransactions(userId);
    }

    throw new RpcException(new NotFoundException(`Cannot ${data.method} /${data.path}`));
  }

  private async handleGetUserTransactions(
    userId: string,
  ): Promise<BaseResponseDto<PointTransactionListResponseDto>> {
    const { transactions, totalCount } =
      await this.pointTransactionService.findTransactionsByUserId(userId);

    const response: PointTransactionListResponseDto = {
      transactions: transactions.map(tx =>
        plainToClass(PointTransactionResponseDto, {
          transactionId: tx._id,
          userId: tx.userId,
          amount: tx.amount,
          type: tx.type,
          description: tx.description,
          createdAt: tx.timestamp,
        }),
      ),
      totalCount,
    };

    return {
      statusCode: HttpStatus.OK,
      message: '포인트 트랜잭션 목록을 성공적으로 조회했습니다.',
      data: response,
      timestamp: new Date().toISOString(),
    };
  }
}
