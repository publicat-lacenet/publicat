export const VIDEO_RETENTION_POLICIES = [
  'end_of_school_year',
  'indefinite',
  'custom_date',
] as const;

export type VideoRetentionPolicy = (typeof VIDEO_RETENTION_POLICIES)[number];

export type NormalizedVideoRetention = {
  retention_policy: VideoRetentionPolicy;
  delete_on: string | null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MADRID_TIME_ZONE = 'Europe/Madrid';

export class VideoRetentionValidationError extends Error {}

export function getMadridToday(referenceDate = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MADRID_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(referenceDate);
}

export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function getEndOfSchoolYearDeleteOn(
  referenceDate = getMadridToday()
): string {
  if (!isValidDateString(referenceDate)) {
    throw new VideoRetentionValidationError('La data de referència no és vàlida');
  }

  const year = Number(referenceDate.slice(0, 4));
  const currentYearEnd = `${year}-07-31`;
  return referenceDate <= currentYearEnd
    ? currentYearEnd
    : `${year + 1}-07-31`;
}

export function normalizeVideoRetention(
  policyValue: unknown,
  deleteOnValue: unknown,
  options: { defaultPolicy?: VideoRetentionPolicy; today?: string } = {}
): NormalizedVideoRetention {
  const defaultPolicy = options.defaultPolicy ?? 'end_of_school_year';
  const policy = policyValue === undefined ? defaultPolicy : policyValue;
  const today = options.today ?? getMadridToday();

  if (
    typeof policy !== 'string' ||
    !VIDEO_RETENTION_POLICIES.includes(policy as VideoRetentionPolicy)
  ) {
    throw new VideoRetentionValidationError(
      'La política de conservació no és vàlida'
    );
  }

  const validatedPolicy = policy as VideoRetentionPolicy;

  if (validatedPolicy === 'indefinite') {
    return {
      retention_policy: validatedPolicy,
      delete_on: null,
    };
  }

  if (validatedPolicy === 'end_of_school_year') {
    return {
      retention_policy: validatedPolicy,
      delete_on: getEndOfSchoolYearDeleteOn(today),
    };
  }

  if (typeof deleteOnValue !== 'string' || !isValidDateString(deleteOnValue)) {
    throw new VideoRetentionValidationError(
      'Cal seleccionar una data de conservació vàlida'
    );
  }

  if (deleteOnValue < today) {
    throw new VideoRetentionValidationError(
      'La data de conservació no pot ser anterior a avui'
    );
  }

  return {
    retention_policy: validatedPolicy,
    delete_on: deleteOnValue,
  };
}

export function formatRetentionDate(dateValue: string): string {
  if (!isValidDateString(dateValue)) return dateValue;

  const [year, month, day] = dateValue.split('-').map(Number);
  return new Intl.DateTimeFormat('ca-ES', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatVideoRetentionSummary(
  policy: VideoRetentionPolicy,
  deleteOn: string | null
): string {
  if (policy === 'indefinite') {
    return 'Sense límit';
  }

  if (!deleteOn) {
    return policy === 'end_of_school_year'
      ? 'Fins al 31 de juliol'
      : 'Data pendent';
  }

  return `Fins al ${formatRetentionDate(deleteOn)}`;
}
