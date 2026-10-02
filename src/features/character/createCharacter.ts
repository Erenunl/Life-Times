import {
  INITIAL_EDUCATION_STATUS,
  STARTING_AGE,
  STARTING_LIFE_STAGE,
  STARTING_MONEY,
} from "../../config/gameRules";
import type { Character, FormattedGameDate, Gender, ProfileImage } from "../../types/game";
import { getBirthDateForAge } from "../../utils/gameTime";
import { getCurrentRealTime, toStoredTimestamp } from "../../utils/realTime";

export type CharacterCreationInput = {
  firstName: string;
  lastName: string;
  gender: Gender;
  biography: string;
  cityId: string;
  profileImage?: ProfileImage;
  currentGameDate: FormattedGameDate;
};

export function createCharacter(input: CharacterCreationInput): Character {
  const createdAt = toStoredTimestamp(getCurrentRealTime());

  return {
    id: crypto.randomUUID(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    gender: input.gender,
    birthDate: getBirthDateForAge(input.currentGameDate, STARTING_AGE),
    biography: input.biography.trim(),
    profileImage: input.profileImage,
    cityId: input.cityId,
    money: STARTING_MONEY,
    lifeStage: STARTING_LIFE_STAGE,
    education: { ...INITIAL_EDUCATION_STATUS },
    career: {
      status: "none",
      title: "Not employed",
      weeklyIncome: 0,
      reputation: 0,
    },
    mood: 70,
    energy: 70,
    createdAt,
    lastActiveAt: createdAt,
    isDeceased: false,
  };
}

export function getCharacterDisplayName(character: Pick<Character, "firstName" | "lastName">): string {
  return `${character.firstName} ${character.lastName}`;
}
