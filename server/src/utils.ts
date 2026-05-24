export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function buildEmail(name: string, domain: string) {
  const cleanName = name.trim().toLowerCase();
  const cleanDomain = domain.trim().toLowerCase().replace(/^@/, "");

  if (!/^[a-z0-9._-]{1,64}$/.test(cleanName)) {
    throw new Error("Use letters, numbers, dots, dashes, or underscores.");
  }

  return `${cleanName}@${cleanDomain}`;
}
