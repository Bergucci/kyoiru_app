import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PushTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async revokeAllForUser(userId: string, revokedAt: Date): Promise<void> {
    await this.prisma.pushToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt,
      },
    });
  }
}
