import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthLoginRequestDto } from './dto/auth-login-request.dto';
import { AuthRegisterRequestDto } from './dto/auth-register-request.dto';
import { passwordPolicyError } from './password-policy';

describe('password policy', () => {
  it.each(['abcde1', 'ABCDE1', 'abcde1!', 'áéíóú١', '漢字日本語2'])('accepts %s', (password) => {
    expect(passwordPolicyError(password)).toBeNull();
  });
  it.each(['abcd!1', 'abcdef', '123456', '', '💡💡💡💡💡1'])('rejects %s', (password) => {
    expect(passwordPolicyError(password)).not.toBeNull();
  });
  it('rejects Unicode passwords above the bcrypt byte limit', () => {
    expect(passwordPolicyError('á'.repeat(36) + '1')).toContain('72 bytes');
    expect(passwordPolicyError('a'.repeat(71) + '1')).toBeNull();
  });
  it.each(['x', 'old!', '123456', 'a'.repeat(100)])(
    'does not reapply creation rules on login',
    async (password) => {
      expect(
        await validate(plainToInstance(AuthLoginRequestDto, { identifier: 'user1', password })),
      ).toEqual([]);
    },
  );
  it('requires a login password', async () => {
    expect(
      await validate(plainToInstance(AuthLoginRequestDto, { identifier: 'user1', password: '' })),
    ).not.toEqual([]);
  });
  it.each(['abcd', '12345', 'user@name', 'x'.repeat(81)])(
    'preserves username constraints for %s',
    async (username) => {
      const errors = await validate(
        plainToInstance(AuthRegisterRequestDto, {
          email: 'user@example.com',
          username,
          password: 'abcde1',
        }),
      );
      expect(errors.some((error) => error.property === 'username')).toBe(true);
    },
  );
  it('accepts and trims a normal username', async () => {
    const payload = plainToInstance(AuthRegisterRequestDto, {
      email: ' USER@example.com ',
      username: ' User1 ',
      password: 'abcde1',
    });
    expect(await validate(payload)).toEqual([]);
    expect(payload.username).toBe('User1');
    expect(payload.email).toBe('user@example.com');
  });
});
