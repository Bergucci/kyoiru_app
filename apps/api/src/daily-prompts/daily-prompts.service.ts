import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { getCurrentBusinessDateJst } from '../me/me.utils.js';
import { isValidChoiceForPrompt, resolvePromptKey } from './prompt-pool.js';

type PrismaTx = Prisma.TransactionClient;

export interface DailyPromptAnswerView {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  choiceKey: string;
}

export interface DailyPromptView {
  promptKey: string;
  businessDateJst: string;
  answers: DailyPromptAnswerView[];
  myAnswer: string | null;
}

export interface SetDailyPromptAnswerResult {
  promptKey: string;
  businessDateJst: string;
  choiceKey: string;
}

@Injectable()
export class DailyPromptsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyPrompt(
    currentUser: User,
    groupId: string,
  ): Promise<DailyPromptView> {
    await this.assertGroupMember(this.prisma, groupId, currentUser.id);

    const businessDateJst = getCurrentBusinessDateJst(new Date());
    const prompt = await this.ensurePromptForToday(
      this.prisma,
      groupId,
      businessDateJst,
    );

    const answers = await this.prisma.dailyPromptAnswer.findMany({
      where: { promptId: prompt.id },
      select: {
        userId: true,
        choiceKey: true,
        user: {
          select: {
            id: true,
            userId: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const blockedIds = await this.findBlockedUserIds(
      currentUser.id,
      answers.map((answer) => answer.userId),
    );

    const view: DailyPromptAnswerView[] = answers
      .filter((answer) => !blockedIds.has(answer.userId))
      .map((answer) => ({
        userId: answer.user.userId,
        displayName: answer.user.displayName,
        avatarUrl: answer.user.avatarUrl,
        choiceKey: answer.choiceKey,
      }));

    const myAnswer =
      answers.find((answer) => answer.userId === currentUser.id)?.choiceKey ??
      null;

    return {
      promptKey: prompt.promptKey,
      businessDateJst: prompt.businessDateJst,
      answers: view,
      myAnswer,
    };
  }

  async setAnswer(
    currentUser: User,
    groupId: string,
    choiceKey: string,
  ): Promise<SetDailyPromptAnswerResult> {
    return this.prisma.$transaction(async (tx) => {
      await this.assertGroupMember(tx, groupId, currentUser.id);

      const businessDateJst = getCurrentBusinessDateJst(new Date());
      const prompt = await this.ensurePromptForToday(
        tx,
        groupId,
        businessDateJst,
      );

      if (!isValidChoiceForPrompt(prompt.promptKey, choiceKey)) {
        throw new BadRequestException('Invalid choice for current prompt');
      }

      await tx.dailyPromptAnswer.upsert({
        where: {
          uq_daily_prompt_answers_prompt_user: {
            promptId: prompt.id,
            userId: currentUser.id,
          },
        },
        create: {
          promptId: prompt.id,
          userId: currentUser.id,
          choiceKey,
        },
        update: {
          choiceKey,
        },
      });

      return {
        promptKey: prompt.promptKey,
        businessDateJst: prompt.businessDateJst,
        choiceKey,
      };
    });
  }

  private async ensurePromptForToday(
    client: PrismaTx | PrismaService,
    groupId: string,
    businessDateJst: string,
  ) {
    const existing = await client.dailyPrompt.findUnique({
      where: {
        uq_daily_prompts_group_business_date: {
          groupId,
          businessDateJst,
        },
      },
      select: {
        id: true,
        promptKey: true,
        businessDateJst: true,
      },
    });
    if (existing) {
      return existing;
    }

    const promptKey = resolvePromptKey(groupId, businessDateJst);
    try {
      const created = await client.dailyPrompt.create({
        data: {
          groupId,
          businessDateJst,
          promptKey,
        },
        select: {
          id: true,
          promptKey: true,
          businessDateJst: true,
        },
      });
      return created;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const row = await client.dailyPrompt.findUnique({
          where: {
            uq_daily_prompts_group_business_date: {
              groupId,
              businessDateJst,
            },
          },
          select: {
            id: true,
            promptKey: true,
            businessDateJst: true,
          },
        });
        if (row) {
          return row;
        }
      }
      throw err;
    }
  }

  private async assertGroupMember(
    client: PrismaTx | PrismaService,
    groupId: string,
    userId: string,
  ) {
    const group = await client.group.findFirst({
      where: {
        id: groupId,
        members: { some: { userId } },
      },
      select: { id: true },
    });
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    return group;
  }

  private async findBlockedUserIds(
    userId: string,
    otherUserIds: string[],
  ): Promise<Set<string>> {
    const filtered = otherUserIds.filter((id) => id !== userId);
    if (filtered.length === 0) {
      return new Set();
    }
    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerUserId: userId, blockedUserId: { in: filtered } },
          { blockerUserId: { in: filtered }, blockedUserId: userId },
        ],
      },
      select: {
        blockerUserId: true,
        blockedUserId: true,
      },
    });
    return new Set(
      blocks.map((block) =>
        block.blockerUserId === userId ? block.blockedUserId : block.blockerUserId,
      ),
    );
  }
}
