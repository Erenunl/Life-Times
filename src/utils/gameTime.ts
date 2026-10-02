import type { FormattedGameDate, GameDate } from "../types/game";
import type { AppLanguage } from "../i18n/language";

const REAL_DAYS_PER_GAME_YEAR = 30;
const GAME_MONTHS_PER_YEAR = 12;
const GAME_DAYS_PER_YEAR = 360;
const GAME_DAYS_PER_MONTH = GAME_DAYS_PER_YEAR / GAME_MONTHS_PER_YEAR;
const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;
const GAME_DAYS_PER_REAL_DAY = GAME_DAYS_PER_YEAR / REAL_DAYS_PER_GAME_YEAR;

export const GAME_START_YEAR = 2000;

// Canonical local prototype epoch. Later this can be replaced by a server-provided
// timestamp while keeping the same calculation functions.
export const GAME_EPOCH_TIMESTAMP = Date.UTC(2026, 0, 1, 0, 0, 0);

export function getGameDate(nowTimestamp = Date.now(), epochTimestamp = GAME_EPOCH_TIMESTAMP): FormattedGameDate {
  const elapsedRealMs = Math.max(0, nowTimestamp - epochTimestamp);
  const elapsedRealDays = elapsedRealMs / MS_PER_REAL_DAY;
  const totalElapsedGameDays = Math.floor(elapsedRealDays * GAME_DAYS_PER_REAL_DAY);

  const yearsElapsed = Math.floor(totalElapsedGameDays / GAME_DAYS_PER_YEAR);
  const dayOfYear = totalElapsedGameDays % GAME_DAYS_PER_YEAR;
  const month = Math.floor(dayOfYear / GAME_DAYS_PER_MONTH) + 1;
  const day = (dayOfYear % GAME_DAYS_PER_MONTH) + 1;
  const year = GAME_START_YEAR + yearsElapsed;

  return {
    year,
    month,
    day,
    formatted: formatGameDate({ year, month, day }),
  };
}

const monthNames: Record<AppLanguage, string[]> = {
  en: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  tr: [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ],
};

export function formatGameDate(date: Pick<GameDate, "year" | "month" | "day">, language: AppLanguage = "en"): string {
  const monthName = monthNames[language][date.month - 1] ?? monthNames.en[0];

  if (language === "tr") {
    return `${date.day} ${monthName} ${date.year}`;
  }

  return `${monthName} ${date.day}, ${date.year}`;
}

export function getBirthDateForAge(currentDate: GameDate, age: number): GameDate {
  return {
    year: currentDate.year - age,
    month: currentDate.month,
    day: currentDate.day,
  };
}

export function calculateAge(currentDate: GameDate, birthDate: GameDate): number {
  let age = currentDate.year - birthDate.year;

  if (
    currentDate.month < birthDate.month ||
    (currentDate.month === birthDate.month && currentDate.day < birthDate.day)
  ) {
    age -= 1;
  }

  return Math.max(0, age);
}
