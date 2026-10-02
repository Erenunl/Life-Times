import { INACTIVITY_DEATH_MS } from "../../config/characterRules";
import type { Character } from "../../types/game";
import { calculateAge, getGameDate } from "../../utils/gameTime";
import { getCurrentRealTime, toStoredTimestamp } from "../../utils/realTime";

export type CharacterStartupResult = {
  character: Character;
  changed: boolean;
};

export function prepareCharacterForGameEntry(
  character: Character,
  now = getCurrentRealTime(),
): CharacterStartupResult {
  const migratedCharacter = migrateCharacterLifecycleFields(character, now);

  if (migratedCharacter.isDeceased) {
    return { character: migratedCharacter, changed: migratedCharacter !== character };
  }

  const deathCheckedCharacter = applyInactivityDeathIfNeeded(migratedCharacter, now);

  if (deathCheckedCharacter.isDeceased) {
    return { character: deathCheckedCharacter, changed: true };
  }

  return {
    character: markCharacterActive(deathCheckedCharacter, now),
    changed: true,
  };
}

export function migrateCharacterLifecycleFields(character: Character, now = getCurrentRealTime()): Character {
  let migratedCharacter = character;

  if (!migratedCharacter.lastActiveAt) {
    migratedCharacter = {
      ...migratedCharacter,
      lastActiveAt: toStoredTimestamp(now),
    };
  }

  if (typeof migratedCharacter.isDeceased !== "boolean") {
    migratedCharacter = {
      ...migratedCharacter,
      isDeceased: false,
    };
  }

  return migratedCharacter;
}

export function applyInactivityDeathIfNeeded(character: Character, now = getCurrentRealTime()): Character {
  if (character.isDeceased) {
    return character;
  }

  const lastActiveAt = new Date(character.lastActiveAt).getTime();

  if (now.getTime() - lastActiveAt < INACTIVITY_DEATH_MS) {
    return character;
  }

  return {
    ...character,
    isDeceased: true,
    diedAt: toStoredTimestamp(now),
    ageAtDeath: calculateAge(getGameDate(), character.birthDate),
    deathReason: "inactivity",
  };
}

export function markCharacterActive(character: Character, now = getCurrentRealTime()): Character {
  if (character.isDeceased) {
    return character;
  }

  return {
    ...character,
    lastActiveAt: toStoredTimestamp(now),
  };
}
