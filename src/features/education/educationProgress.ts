import {
  ATTENDANCE_SCORE_GAIN,
  INITIAL_SUBJECT_SCORE,
  MAX_CLASS_DECISIONS_HISTORY,
  MAX_EDUCATION_EVENTS,
} from "../../config/educationRules";
import { DEFAULT_HIGH_SCHOOL_ID } from "../../data/schools";
import { curriculumByDirection, findSubjectById, subjects } from "../../data/subjects";
import { loadEducationProgress, saveEducationProgress } from "../../services/storage/educationStorage";
import type {
  AcademicDirection,
  ClassDecision,
  EducationEvent,
  EducationProgress,
  SubjectPerformance,
} from "../../types/game";
import {
  canTakeNextClass,
  getCurrentRealTime,
  getRealDateKey,
  getRealWeekKey,
  toStoredTimestamp,
} from "../../utils/realTime";
import { clampScore } from "./educationUtils";
import { acknowledgeExamResult, processDueExams } from "./examSystem";

export function loadOrInitializeEducationProgress(characterId: string, now = getCurrentRealTime()): EducationProgress {
  const storedProgress = loadEducationProgress(characterId);

  if (!storedProgress) {
    const initializedProgress = initializeEducationProgress(characterId, now);
    saveEducationProgress(initializedProgress);
    return initializedProgress;
  }

  const normalizedProgress = normalizeEducationProgress(storedProgress, now);
  saveEducationProgress(normalizedProgress);
  return normalizedProgress;
}

export function initializeEducationProgress(characterId: string, now = getCurrentRealTime()): EducationProgress {
  return {
    characterId,
    schoolId: DEFAULT_HIGH_SCHOOL_ID,
    educationStartedAt: toStoredTimestamp(now),
    curriculumSubjectIds: [],
    subjectPerformances: {},
    rotationIndex: 0,
    currentWeekKey: getRealWeekKey(now),
    weeklyAttended: 0,
    weeklySkipped: 0,
    totalAttended: 0,
    totalSkipped: 0,
    examCycleStartedAt: toStoredTimestamp(now),
    processedExamPeriodKeys: [],
    examHistory: [],
    decisions: [],
    events: [
      createEducationEvent("You began high school.", now),
    ],
    updatedAt: toStoredTimestamp(now),
  };
}

export function selectAcademicDirection(
  progress: EducationProgress,
  academicDirection: AcademicDirection,
  now = getCurrentRealTime(),
): EducationProgress {
  if (progress.academicDirection) {
    return progress;
  }

  const curriculumSubjectIds = curriculumByDirection[academicDirection];
  const updatedProgress = normalizeEducationProgress({
    ...progress,
    academicDirection,
    curriculumSubjectIds,
    subjectPerformances: createSubjectPerformances(curriculumSubjectIds),
    rotationIndex: 0,
    currentOfferedSubjectId: curriculumSubjectIds[0],
    events: addEducationEvent(
      progress.events,
      `You chose a ${getDirectionEventLabel(academicDirection)} academic focus.`,
      now,
    ),
    updatedAt: toStoredTimestamp(now),
  }, now);

  saveEducationProgress(updatedProgress);
  return updatedProgress;
}

export function recordClassAttendance(progress: EducationProgress, now = getCurrentRealTime()): EducationProgress {
  return recordClassDecision(progress, "attended", now);
}

export function recordClassSkip(progress: EducationProgress, now = getCurrentRealTime()): EducationProgress {
  return recordClassDecision(progress, "skipped", now);
}

export function acknowledgeEducationExam(
  progress: EducationProgress,
  examId: string,
  now = getCurrentRealTime(),
): EducationProgress {
  const updatedProgress = acknowledgeExamResult(progress, examId, now);
  saveEducationProgress(updatedProgress);
  return updatedProgress;
}

export function normalizeEducationProgress(progress: EducationProgress, now = getCurrentRealTime()): EducationProgress {
  const currentWeekKey = getRealWeekKey(now);
  const isNewWeek = progress.currentWeekKey !== currentWeekKey;
  const curriculumSubjectIds = progress.curriculumSubjectIds;
  const currentOfferedSubjectId = progress.currentOfferedSubjectId ?? curriculumSubjectIds[progress.rotationIndex] ?? curriculumSubjectIds[0];
  const educationStartedAt = progress.educationStartedAt ?? getMigrationStartTimestamp(progress, now);
  const examCycleStartedAt = progress.examCycleStartedAt ?? educationStartedAt;
  const normalizedProgress = {
    ...progress,
    educationStartedAt,
    examCycleStartedAt,
    processedExamPeriodKeys: progress.processedExamPeriodKeys ?? [],
    examHistory: progress.examHistory ?? [],
    decisions: progress.decisions ?? [],
    events: progress.events ?? [],
    currentWeekKey,
    weeklyAttended: isNewWeek ? 0 : progress.weeklyAttended,
    weeklySkipped: isNewWeek ? 0 : progress.weeklySkipped,
    currentOfferedSubjectId,
    updatedAt: toStoredTimestamp(now),
  };

  return processDueExams(normalizedProgress, now);
}

function recordClassDecision(
  progress: EducationProgress,
  decision: ClassDecision["decision"],
  now: Date,
): EducationProgress {
  const normalizedProgress = normalizeEducationProgress(progress, now);
  const subjectId = normalizedProgress.currentOfferedSubjectId;

  if (!subjectId || !canTakeNextClass(normalizedProgress, now)) {
    return normalizedProgress;
  }

  const subject = findSubjectById(subjectId);
  const subjectName = subject?.name ?? "Class";
  const classDecision: ClassDecision = {
    id: crypto.randomUUID(),
    subjectId,
    decision,
    decidedAt: toStoredTimestamp(now),
    realDateKey: getRealDateKey(now),
    realWeekKey: getRealWeekKey(now),
  };
  const curriculumLength = Math.max(normalizedProgress.curriculumSubjectIds.length, 1);
  const nextRotationIndex = (normalizedProgress.rotationIndex + 1) % curriculumLength;
  const nextSubjectId = normalizedProgress.curriculumSubjectIds[nextRotationIndex];
  const subjectPerformances = { ...normalizedProgress.subjectPerformances };
  let events = normalizedProgress.events;

  if (decision === "attended") {
    const currentScore = subjectPerformances[subjectId]?.score ?? INITIAL_SUBJECT_SCORE;
    const nextScore = clampScore(currentScore + ATTENDANCE_SCORE_GAIN);
    subjectPerformances[subjectId] = { subjectId, score: nextScore };
    events = addEducationEvent(events, `You attended ${subjectName}.`, now);
    events = addEducationEvent(events, `Your ${subjectName} performance improved.`, now);
  } else {
    events = addEducationEvent(events, `You skipped ${subjectName}.`, now);
  }

  const updatedProgress: EducationProgress = {
    ...normalizedProgress,
    subjectPerformances,
    rotationIndex: nextRotationIndex,
    currentOfferedSubjectId: nextSubjectId,
    lastClassDecisionAt: toStoredTimestamp(now),
    weeklyAttended: normalizedProgress.weeklyAttended + (decision === "attended" ? 1 : 0),
    weeklySkipped: normalizedProgress.weeklySkipped + (decision === "skipped" ? 1 : 0),
    totalAttended: normalizedProgress.totalAttended + (decision === "attended" ? 1 : 0),
    totalSkipped: normalizedProgress.totalSkipped + (decision === "skipped" ? 1 : 0),
    decisions: [...normalizedProgress.decisions, classDecision].slice(-MAX_CLASS_DECISIONS_HISTORY),
    events,
    updatedAt: toStoredTimestamp(now),
  };

  saveEducationProgress(updatedProgress);
  return updatedProgress;
}

function createSubjectPerformances(curriculumSubjectIds: string[]): Record<string, SubjectPerformance> {
  const uniqueSubjectIds = [...new Set([...curriculumSubjectIds, ...subjects.map((subject) => subject.id)])];

  return Object.fromEntries(
    uniqueSubjectIds.map((subjectId) => [
      subjectId,
      {
        subjectId,
        score: INITIAL_SUBJECT_SCORE,
      },
    ]),
  );
}

function addEducationEvent(events: EducationEvent[], message: string, now: Date): EducationEvent[] {
  return [createEducationEvent(message, now), ...events].slice(0, MAX_EDUCATION_EVENTS);
}

function createEducationEvent(message: string, now: Date): EducationEvent {
  return {
    id: crypto.randomUUID(),
    message,
    createdAt: toStoredTimestamp(now),
  };
}

function getMigrationStartTimestamp(progress: EducationProgress, now: Date): string {
  const firstDecision = progress.decisions?.[0]?.decidedAt;
  const firstEvent = progress.events?.[progress.events.length - 1]?.createdAt;

  return firstDecision ?? firstEvent ?? progress.updatedAt ?? toStoredTimestamp(now);
}

function getDirectionEventLabel(direction: AcademicDirection): string {
  if (direction === "quantitative") {
    return "Quantitative / STEM";
  }

  if (direction === "verbal") {
    return "Verbal / Humanities";
  }

  return "Balanced";
}
