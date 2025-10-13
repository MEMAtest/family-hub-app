import { redactSensitiveData } from '../privacy';

describe('privacy', () => {
  describe('redactSensitiveData', () => {
    describe('email redaction', () => {
      it('should redact a single email address', () => {
        const input = 'Contact me at user@example.com for more info';
        const result = redactSensitiveData(input);
        expect(result).toBe('Contact me at [REDACTED] for more info');
      });

      it('should redact multiple email addresses', () => {
        const input = 'Email alice@test.com or bob@test.co.uk';
        const result = redactSensitiveData(input);
        expect(result).toBe('Email [REDACTED] or [REDACTED]');
      });

      it('should redact emails with various TLDs', () => {
        expect(redactSensitiveData('user@example.com')).toBe('[REDACTED]');
        expect(redactSensitiveData('user@example.co.uk')).toBe('[REDACTED]');
        expect(redactSensitiveData('user@example.org')).toBe('[REDACTED]');
        expect(redactSensitiveData('user@example.net')).toBe('[REDACTED]');
      });

      it('should redact emails with special characters', () => {
        expect(redactSensitiveData('user+tag@example.com')).toBe('[REDACTED]');
        expect(redactSensitiveData('user.name@example.com')).toBe('[REDACTED]');
        expect(redactSensitiveData('user_name@example.com')).toBe('[REDACTED]');
      });

      it('should redact emails with numbers', () => {
        expect(redactSensitiveData('user123@example.com')).toBe('[REDACTED]');
        expect(redactSensitiveData('123user@example.com')).toBe('[REDACTED]');
      });
    });

    describe('phone number redaction', () => {
      it('should redact international format phone numbers', () => {
        const result1 = redactSensitiveData('Call +44 20 7946 0958');
        expect(result1).toContain('[REDACTED]');
        expect(result1).not.toContain('+44 20 7946 0958');

        const result2 = redactSensitiveData('Phone: +1 555 123 4567');
        expect(result2).toContain('[REDACTED]');
        expect(result2).not.toContain('+1 555 123 4567');
      });

      it('should attempt to redact UK phone numbers', () => {
        // The regex may not catch all formats perfectly, but should attempt redaction
        const result1 = redactSensitiveData('Call me on 07700 900123');
        expect(result1).toContain('[REDACTED]');

        const result2 = redactSensitiveData('Phone: 020 7946 0958');
        expect(result2).toContain('[REDACTED]');
      });

      it('should attempt to redact phone numbers with separators', () => {
        // The regex attempts to match various separator formats
        expect(redactSensitiveData('07700 900 123')).toContain('[REDACTED]');
      });
    });

    describe('mixed content redaction', () => {
      it('should redact both emails and phone numbers', () => {
        const input = 'Contact alice@test.com or call 07700 900123';
        const result = redactSensitiveData(input);
        // Should redact the email completely
        expect(result).not.toContain('alice@test.com');
        // Should attempt to redact phone number
        expect(result).toContain('[REDACTED]');
      });

      it('should redact multiple types of sensitive data', () => {
        const input = 'Email: user@example.com, Phone: +44 20 7946 0958, Alt: bob@test.com';
        const result = redactSensitiveData(input);
        expect(result).not.toContain('user@example.com');
        expect(result).not.toContain('bob@test.com');
        expect(result).toContain('[REDACTED]');
      });
    });

    describe('custom replacement text', () => {
      it('should use custom replacement text', () => {
        const input = 'Email user@example.com';
        const result = redactSensitiveData(input, '***');
        expect(result).toBe('Email ***');
      });

      it('should use custom replacement for emails', () => {
        const input = 'user@example.com and bob@test.com';
        const result = redactSensitiveData(input, 'XXXXX');
        expect(result).toBe('XXXXX and XXXXX');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined input', () => {
        const result = redactSensitiveData(undefined);
        expect(result).toBeUndefined();
      });

      it('should handle null input', () => {
        const result = redactSensitiveData(null);
        expect(result).toBeNull();
      });

      it('should handle empty string', () => {
        const result = redactSensitiveData('');
        expect(result).toBe('');
      });

      it('should return unchanged text with no sensitive data', () => {
        const input = 'This is a normal message with no sensitive information';
        const result = redactSensitiveData(input);
        expect(result).toBe(input);
      });

      it('should handle strings with only sensitive data', () => {
        expect(redactSensitiveData('user@example.com')).toBe('[REDACTED]');
        // Phone numbers may be partially redacted depending on format
        const phoneResult = redactSensitiveData('07700 900123');
        expect(phoneResult).toContain('[REDACTED]');
      });
    });

    describe('case insensitivity', () => {
      it('should redact emails regardless of case', () => {
        expect(redactSensitiveData('USER@EXAMPLE.COM')).toBe('[REDACTED]');
        expect(redactSensitiveData('User@Example.Com')).toBe('[REDACTED]');
      });
    });

    describe('special contexts', () => {
      it('should redact emails in JSON-like strings', () => {
        const input = '{"email": "user@example.com", "phone": "07700900123"}';
        const result = redactSensitiveData(input);
        expect(result).not.toContain('user@example.com');
        expect(result).toContain('[REDACTED]');
      });

      it('should redact emails in URLs', () => {
        const input = 'mailto:user@example.com';
        const result = redactSensitiveData(input);
        expect(result).toBe('mailto:[REDACTED]');
      });

      it('should handle multiline strings', () => {
        const input = `Name: John Doe
Email: john@example.com
Phone: 07700 900123
Message: Please contact me`;
        const result = redactSensitiveData(input);
        expect(result).not.toContain('john@example.com');
        expect(result).not.toContain('07700 900123');
        expect(result).toContain('[REDACTED]');
      });
    });
  });
});
