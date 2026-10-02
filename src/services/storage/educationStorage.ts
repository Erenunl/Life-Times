import type { EducationProgress } from "../../types/game";

const EDUCATION_STORAGE_PREFIX = "life-and-times:education-progress:";

export function loadEducationProgress(characterId: string): EducationProgress | null {
  const rawProgress = window.localStorage.getItem(getEducationStorageKey(characterId));

  if (!rawProgress) {
    return null;
  }

  try {
    const parsedProgress = JSON.parse(rawProgress);
    return isStoredEducationProgress(parsedProgress) ? parsedProgress : null;
  } catch {
    window.localStorage.removeItem(getEducationStorageKey(characterId));
    return null;
  }
}

export function saveEducationProgress(progress: EducationProgress): void {
  window.localStorage.setItem(getEducationStorageKey(progress.characterId), JSON.stringify(progress));
}

function getEducationStorageKey(characterId: string): string {
  return `${EDUCATION_STORAGE_PREFIX}${characterId}`;
}

function isStoredEducationProgress(value: unknown): value is EducationProgress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<EducationProgress>;

  return (
    typeof candidate.characterId === "string" &&
    typeof candidate.schoolId === "string" &&
    Array.isArray(candidate.curriculumSubjectIds) &&
    typeof candidate.subjectPerformances === "object" &&
    typeof candidate.rotationIndex === "number" &&
    typeof candidate.currentWeekKey === "string" &&
    typeof candidate.weeklyAttended === "number" &&
    typeof candidate.weeklySkipped === "number" &&
    typeof candidate.totalAttended === "number" &&
    typeof candidate.totalSkipped === "number" &&
    Array.isArray(candidate.decisions) &&
    Array.isArray(candidate.events) &&
    typeof candidate.updatedAt === "string"
  );
}
