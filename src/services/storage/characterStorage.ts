import type { Character } from "../../types/game";
import { migrateCharacterLifecycleFields } from "../../features/character/characterLifecycle";
import { getCurrentRealTime } from "../../utils/realTime";

const CHARACTER_STORAGE_KEY = "life-and-times:character";
const DECEASED_CHARACTERS_STORAGE_KEY = "life-and-times:deceased-characters";

export function loadCharacter(): Character | null {
  const rawCharacter = window.localStorage.getItem(CHARACTER_STORAGE_KEY);

  if (!rawCharacter) {
    return null;
  }

  try {
    const parsedCharacter = JSON.parse(rawCharacter);

    if (!isStoredCharacter(parsedCharacter)) {
      window.localStorage.removeItem(CHARACTER_STORAGE_KEY);
      return null;
    }

    const migratedCharacter = migrateCharacterLifecycleFields(parsedCharacter, getCurrentRealTime());

    if (migratedCharacter !== parsedCharacter) {
      saveCharacter(migratedCharacter);
    }

    return migratedCharacter;
  } catch {
    window.localStorage.removeItem(CHARACTER_STORAGE_KEY);
    return null;
  }
}

export function saveCharacter(character: Character): void {
  window.localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(character));
}

export function deleteCharacter(): void {
  window.localStorage.removeItem(CHARACTER_STORAGE_KEY);
}

export function archiveDeceasedCharacter(character: Character): void {
  const archivedCharacters = loadDeceasedCharacters();
  const nextArchivedCharacters = [
    character,
    ...archivedCharacters.filter((archivedCharacter) => archivedCharacter.id !== character.id),
  ];

  window.localStorage.setItem(DECEASED_CHARACTERS_STORAGE_KEY, JSON.stringify(nextArchivedCharacters));
}

export function loadDeceasedCharacters(): Character[] {
  const rawCharacters = window.localStorage.getItem(DECEASED_CHARACTERS_STORAGE_KEY);

  if (!rawCharacters) {
    return [];
  }

  try {
    const parsedCharacters = JSON.parse(rawCharacters);

    if (!Array.isArray(parsedCharacters)) {
      return [];
    }

    return parsedCharacters.filter(isStoredCharacter);
  } catch {
    return [];
  }
}

function isStoredCharacter(value: unknown): value is Character {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Character>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.firstName === "string" &&
    typeof candidate.lastName === "string" &&
    typeof candidate.cityId === "string" &&
    typeof candidate.money === "number" &&
    typeof candidate.createdAt === "string" &&
    (typeof candidate.lastActiveAt === "string" || typeof candidate.lastActiveAt === "undefined") &&
    (typeof candidate.isDeceased === "boolean" || typeof candidate.isDeceased === "undefined") &&
    typeof candidate.birthDate?.year === "number" &&
    typeof candidate.birthDate.month === "number" &&
    typeof candidate.birthDate.day === "number" &&
    candidate.lifeStage === "high-school"
  );
}
