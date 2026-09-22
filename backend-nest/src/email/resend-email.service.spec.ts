import { ConfigService } from '@nestjs/config';
import { ResendEmailService } from './resend-email.service';
import type { EnvironmentVariables } from '../config/app.config';

describe('Resend adapter', () => {
  const message = { to: 'user@example.com', subject: 'Reset', text: 'private-link' };
  const config = new ConfigService<EnvironmentVariables>({
    RESEND_API_KEY: 'test-placeholder',
    EMAIL_FROM: 'Cadisk <sender@example.com>',
  });
  afterEach(() => jest.restoreAllMocks());

  it('uses backend configuration and the Resend HTTP contract', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true } as Response);
    await new ResendEmailService(config).send(message);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer test-placeholder', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Cadisk <sender@example.com>',
          to: [message.to],
          subject: message.subject,
          text: message.text,
        }),
        redirect: 'error',
      }),
    );
  });
  it.each([false, true])('never propagates provider details on failure', async (networkError) => {
    const fetchMock = jest.spyOn(global, 'fetch');
    if (networkError) fetchMock.mockRejectedValue(new Error('private-link and secret'));
    else fetchMock.mockResolvedValue({ ok: false } as Response);
    await expect(new ResendEmailService(config).send(message)).rejects.toThrow(
      /^Email delivery failed$/,
    );
  });
  it('does not send without configuration', async () => {
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(new ResendEmailService(new ConfigService()).send(message)).rejects.toThrow(
      'not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
