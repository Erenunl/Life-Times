import type { EducationStatus } from "../types/game";

export const STARTING_AGE = 16;
export const STARTING_MONEY = 1500;
export const STARTING_LIFE_STAGE = "high-school";

export const INITIAL_EDUCATION_STATUS: EducationStatus = {
  level: "high-school",
  status: "student",
  institutionName: "Local High School",
  track: "General Studies",
  progressPercent: 0,
};
