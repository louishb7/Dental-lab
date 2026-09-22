import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../config/app.config';
import { EmailService, type EmailMessage } from './email.service';

@Injectable()
export class ResendEmailService extends EmailService {
  constructor(private readonly config: ConfigService<EnvironmentVariables>) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const key = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('EMAIL_FROM');
    if (!key || !from) throw new Error('Email delivery is not configured');

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Email delivery failed');
    } catch {
      // Provider errors may contain credentials or message contents. Never propagate them.
      throw new Error('Email delivery failed');
    }
  }
}
