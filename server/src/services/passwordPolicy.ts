const COMMON_PASSWORDS = new Set([
  'password', '12345678', '123456789', '1234567890', 'password1',
  'qwerty123', 'iloveyou', 'admin123', 'letmein12', 'welcome1',
  'monkey123', 'dragon12', 'master12', 'qwerty12', 'abc12345',
  'trustno1', 'baseball', 'football', 'shadow12', 'michael1',
  'jennifer', 'superman', 'abcdefgh', 'abcd1234', 'password123',
  'admin1234', 'changeme', 'welcome123', 'passw0rd', 'p@ssword',
]);

export function validatePassword(password: string): { ok: boolean; reason?: string } {
  if (password.length < 8) return { ok: false, reason: '密码至少需要8个字符' };

  if (/^(.)\1+$/.test(password)) {
    return { ok: false, reason: '密码过于重复' };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, reason: '密码过于常见，请选择一个独特的密码' };
  }

  const requirementsMessage = '密码必须包含至少一个大写字母、一个小写字母、一个数字和一个特殊字符';
  if (!/[A-Z]/.test(password)) return { ok: false, reason: requirementsMessage };
  if (!/[a-z]/.test(password)) return { ok: false, reason: requirementsMessage };
  if (!/[0-9]/.test(password)) return { ok: false, reason: requirementsMessage };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, reason: requirementsMessage };

  return { ok: true };
}
