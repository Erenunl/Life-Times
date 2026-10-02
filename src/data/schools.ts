import type { HighSchoolDefinition } from "../types/game";

export const highSchools: HighSchoolDefinition[] = [
  {
    id: "school-istanbul-central-high",
    name: "İstanbul Central High School",
    cityId: "city-istanbul",
    type: "high-school",
  },
];

export const DEFAULT_HIGH_SCHOOL_ID = "school-istanbul-central-high";

export function findHighSchoolById(schoolId: string): HighSchoolDefinition | undefined {
  return highSchools.find((school) => school.id === schoolId);
}
