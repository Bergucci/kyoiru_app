import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SendContactDto } from './contact.dto.js';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendContactEmail(dto: SendContactDto, userDisplayName?: string): Promise<void> {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER', '');
    const smtpPassword = this.configService.get<string>('SMTP_PASSWORD', '');
    const smtpFrom = this.configService.get<string>('SMTP_FROM', smtpUser);
    const recipientEmail = this.configService.get<string>('CONTACT_RECIPIENT_EMAIL', smtpUser);

    if (!smtpUser || !smtpPassword) {
      this.logger.error('SMTP credentials are not configured');
      throw new InternalServerErrorException('メール送信の設定が完了していません');
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    const subject = `[Kyoiru お問い合わせ] ${dto.category} - ${dto.name}`;

    const text = [
      `■ お問い合わせ種別`,
      dto.category,
      '',
      `■ お名前`,
      dto.name,
      '',
      `■ メールアドレス`,
      dto.email,
      '',
      `■ アプリ内表示名`,
      userDisplayName ?? '（未取得）',
      '',
      `■ お問い合わせ内容`,
      dto.message,
      '',
      '---',
      `送信日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
    ].join('\n');

    try {
      await transporter.sendMail({
        from: `"Kyoiru サポート" <${smtpFrom}>`,
        to: recipientEmail,
        replyTo: dto.email,
        subject,
        text,
      });

      this.logger.log(`Contact email sent from ${dto.email}`);
    } catch (error) {
      this.logger.error('Failed to send contact email', error);
      throw new InternalServerErrorException('メールの送信に失敗しました。しばらく時間をおいて再度お試しください。');
    }
  }
}
