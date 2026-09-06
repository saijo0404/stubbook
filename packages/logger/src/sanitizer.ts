/**
 * 敏感資訊去敏過濾器 (Sanitizer)
 * 避免 API Key、Token、密碼或個人隱私外洩至日誌與 GitHub Issue 中
 */
export function sanitizeLogData(input: unknown): unknown {
  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (input instanceof Error) {
    return {
      name: input.name,
      message: sanitizeString(input.message),
      stack: input.stack ? sanitizeString(input.stack) : undefined,
    };
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeLogData);
  }

  if (input !== null && typeof input === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = '***REDACTED***';
      } else {
        sanitizedObj[key] = sanitizeLogData(value);
      }
    }
    return sanitizedObj;
  }

  return input;
}

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes('token') ||
    lower.includes('secret') ||
    lower.includes('password') ||
    lower.includes('apikey') ||
    lower.includes('api_key') ||
    lower.includes('auth') ||
    lower.includes('key')
  );
}

function sanitizeString(str: string): string {
  return str
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/gi, '$1***REDACTED_TOKEN***')
    .replace(/(gho_[A-Za-z0-9]{30,})/gi, '***REDACTED_GH_TOKEN***')
    .replace(/(eyJ[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_+/=]*)/gi, '***REDACTED_JWT***')
    .replace(
      /([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/gi,
      (match, user, domain, ext) => {
        return `${user.substring(0, 2)}***@${domain}.${ext}`;
      }
    );
}
