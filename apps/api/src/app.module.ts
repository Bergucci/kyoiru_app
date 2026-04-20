import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { GroupsModule } from './groups/groups.module.js';
import { MeModule } from './me/me.module.js';
import { MoodStampsModule } from './mood-stamps/mood-stamps.module.js';
import { DailyPromptsModule } from './daily-prompts/daily-prompts.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { BillingModule } from './billing/billing.module.js';
import { MonitoringModule } from './monitoring/monitoring.module.js';
import { LegalModule } from './legal/legal.module.js';
import { AccountModule } from './account/account.module.js';
import { ContactModule } from './contact/contact.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    FriendsModule,
    GroupsModule,
    MeModule,
    MoodStampsModule,
    DailyPromptsModule,
    NotificationsModule,
    BillingModule,
    MonitoringModule,
    LegalModule,
    AccountModule,
    ContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
