import { normalizeBrazilianPhone } from './doctor-phone';

describe('normalizeBrazilianPhone', () => {
  it('normalizes 10 and 11 digit Brazilian numbers', () => {
    expect(normalizeBrazilianPhone('1133334444')).toBe('(11)3333-4444');
    expect(normalizeBrazilianPhone('11999990000')).toBe('(11)99999-0000');
  });

  it('keeps already formatted numbers and treats blank values as null', () => {
    expect(normalizeBrazilianPhone('(11)3333-4444')).toBe('(11)3333-4444');
    expect(normalizeBrazilianPhone('(11)99999-0000')).toBe('(11)99999-0000');
    expect(normalizeBrazilianPhone('')).toBeNull();
    expect(normalizeBrazilianPhone('   ')).toBeNull();
    expect(normalizeBrazilianPhone(null)).toBeNull();
  });

  it('rejects invalid phone formats with the legacy message', () => {
    expect(() => normalizeBrazilianPhone('123456789')).toThrow('Telefone deve estar em branco');
  });
});
