import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SetMoodStampDto } from './dto/set-mood-stamp.dto.js';
import {
  getCurrentAliveState,
  getCurrentBusinessDateJst,
  listRecentBusinessDatesJst,
} from './me.utils.js';

export interface TodayCheckinResult {
  businessDateJst: string;
  checkedInAt: Date;
}

export interface MoodStampResult {
  businessDateJst: string;
  mood: string;
  deletedAt: Date | null;
}

export interface CheckinHistoryDay {
  businessDateJst: string;
  checkedIn: boolean;
  checkedInAt: Date | null;
  mood: string | null;
  state: 'checked_in' | 'pending' | 'overdue' | 'monitor_alert';
}

export interface CheckinHistoryResult {
  days: CheckinHistoryDay[];
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async checkInToday(currentUser: User): Promise<TodayCheckinResult> {
    const now = new Date();
    const businessDateJst = getCurrentBusinessDateJst(now);

    try {
      const checkin = await this.prisma.dailyCheckin.create({
        data: {
          userId: currentUser.id,
          businessDateJst,
          checkedInAt: now,
        },
      });

      return {
        businessDateJst: checkin.businessDateJst,
        checkedInAt: checkin.checkedInAt,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Already checked in for this business day');
      }
      throw err;
    }
  }

  async setMoodStamp(
    currentUser: User,
    dto: SetMoodStampDto,
  ): Promise<MoodStampResult> {
    const businessDateJst = getCurrentBusinessDateJst(new Date());

    const [checkin, existingMood] = await Promise.all([
      this.prisma.dailyCheckin.findUnique({
        where: {
          uq_daily_checkins_user_business_date: {
            userId: currentUser.id,
            businessDateJst,
          },
        },
      }),
      this.prisma.dailyMoodStamp.findUnique({
        where: {
          uq_daily_mood_stamps_user_business_date: {
            userId: currentUser.id,
            businessDateJst,
          },
        },
      }),
    ]);

    if (!checkin) {
      throw new UnprocessableEntityException(
        'Mood stamp requires a check-in for this business day',
      );
    }
    if (existingMood) {
      throw new ConflictException('Mood stamp already exists for this business day');
    }

    try {
      const moodStamp = await this.prisma.dailyMoodStamp.create({
        data: {
          userId: currentUser.id,
          businessDateJst,
          mood: dto.mood,
        },
      });

      return {
        businessDateJst: moodStamp.businessDateJst,
        mood: moodStamp.mood,
        deletedAt: moodStamp.deletedAt,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Mood stamp already exists for this business day');
      }
      throw err;
    }
  }

  async deleteMoodStamp(currentUser: User): Promise<void> {
    const businessDateJst = getCurrentBusinessDateJst(new Date());
    const deletedAt = new Date();

    const deleted = await this.prisma.dailyMoodStamp.updateMany({
      where: {
        userId: currentUser.id,
        businessDateJst,
        deletedAt: null,
      },
      data: {
        deletedAt,
      },
    });

    if (deleted.count !== 1) {
      throw new NotFoundException('Mood stamp not found');
    }
  }

  async getCheckinHistory(currentUser: User): Promise<CheckinHistoryResult> {
    const now = new Date();
    const businessDates = listRecentBusinessDatesJst(now, 7);
    const currentBusinessDateJst = businessDates[0];

    const [checkins, moodStamps] = await Promise.all([
      this.prisma.dailyCheckin.findMany({
        where: {
          userId: currentUser.id,
          businessDateJst: { in: businessDates },
        },
        select: {
          businessDateJst: true,
          checkedInAt: true,
        },
      }),
      this.prisma.dailyMoodStamp.findMany({
        where: {
          userId: currentUser.id,
          businessDateJst: { in: businessDates },
        },
        select: {
          businessDateJst: true,
          mood: true,
          deletedAt: true,
        },
      }),
    ]);

    const checkinByDate = new Map(
      checkins.map((checkin) => [checkin.businessDateJst, checkin]),
    );
    const moodByDate = new Map(
      moodStamps.map((moodStamp) => [moodStamp.businessDateJst, moodStamp]),
    );

    return {
      days: businessDates.map((businessDateJst) => {
        const checkin = checkinByDate.get(businessDateJst) ?? null;
        const moodStamp = moodByDate.get(businessDateJst) ?? null;

        return {
          businessDateJst,
          checkedIn: checkin !== null,
          checkedInAt: checkin?.checkedInAt ?? null,
          mood: moodStamp && moodStamp.deletedAt === null ? moodStamp.mood : null,
          state:
            checkin !== null
              ? 'checked_in'
              : businessDateJst === currentBusinessDateJst
                ? getCurrentAliveState(now, null)
                : 'overdue',
        };
      }),
    };
  }
}
