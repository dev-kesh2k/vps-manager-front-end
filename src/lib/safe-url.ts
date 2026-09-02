export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url || !isSafeHttpUrl(url)) return null;
  return url;
}
