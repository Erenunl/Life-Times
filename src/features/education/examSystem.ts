import {
  EXAM_PERIOD_MS,
  MAX_EDUCATION_EVENTS,
  MAX_EXAMS_PROCESSED_ON_LOAD,
} from "../../config/educationRules";
import { findSubjectById, subjects } from "../../data/subjects";
import type {
  ClassDecision,
  EducationProgress,
  ExamResult,
  ExamSubjectSnapshot,
  SubjectCategory,
  SubjectPerformance,
} from "../../types/game";
import { toStoredTimestamp } from "../../utils/realTime";
import {
  clampScore,
  getAcademicAverage,
  getCategoryAverage,
  getExamGrade,
} from "./educationUtils";

export function processDueExams(progress: EducationProgress, now: Date): EducationProgress {
  const cycleStart = new Date(progress.examCycleStartedAt);
  const duePeriodIndexes = getDueExamPeriodIndexes(progress, cycleStart, now);

  if (duePeriodIndexes.length === 0) {
    return progress;
  }

  const generatedPeriodIndexes = duePeriodIndexes.slice(-MAX_EXAMS_PROCESSED_ON_LOAD);
  const generatedExams = generatedPeriodIndexes.map((periodIndex) =>
    createExamResult(progress, cycleStart, periodIndex, now),
  );
  const skippedCount = duePeriodIndexes.length - generatedPeriodIndexes.length;
  const processedExamPeriodKeys = [
    ...progress.processedExamPeriodKeys,
    ...duePeriodIndexes.map((periodIndex) => getExamPeriodKey(cycleStart, periodIndex)),
  ];
  const events = generatedExams.reduce(
    (currentEvents, exam) => [
      {
        id: crypto.randomUUID(),
        message: `Your biweekly exam was processed. Score: ${exam.score} — ${exam.grade}.`,
        createdAt: toStoredTimestamp(now),
      },
      ...currentEvents,
    ],
    progress.events,
  );

  const nextEvents = skippedCount > 0
    ? [
        {
          id: crypto.randomUUID(),
          message: `${skippedCount} older exam period${skippedCount === 1 ? "" : "s"} were not generated to keep the local history compact.`,
          createdAt: toStoredTimestamp(now),
        },
        ...events,
      ]
    : events;

  return {
    ...progress,
    processedExamPeriodKeys,
    examHistory: [...generatedExams, ...progress.examHistory],
    events: nextEvents.slice(0, MAX_EDUCATION_EVENTS),
    updatedAt: toStoredTimestamp(now),
  };
}

export function acknowledgeExamResult(progress: EducationProgress, examId: string, now: Date): EducationProgress {
  return {
    ...progress,
    examHistory: progress.examHistory.map((exam) =>
      exam.id === examId ? { ...exam, acknowledged: true } : exam,
    ),
    updatedAt: toStoredTimestamp(now),
  };
}

export function getUnacknowledgedExam(progress: EducationProgress): ExamResult | undefined {
  return progress.examHistory.find((exam) => !exam.acknowledged);
}

function getDueExamPeriodIndexes(progress: EducationProgress, cycleStart: Date, now: Date): number[] {
  const elapsedMs = now.getTime() - cycleStart.getTime();

  if (elapsedMs < EXAM_PERIOD_MS) {
    return [];
  }

  const completedPeriods = Math.floor(elapsedMs / EXAM_PERIOD_MS);
  const duePeriodIndexes: number[] = [];

  for (let periodIndex = 0; periodIndex < completedPeriods; periodIndex += 1) {
    const periodKey = getExamPeriodKey(cycleStart, periodIndex);

    if (!progress.processedExamPeriodKeys.includes(periodKey)) {
      duePeriodIndexes.push(periodIndex);
    }
  }

  return duePeriodIndexes;
}

function createExamResult(
  progress: EducationProgress,
  cycleStart: Date,
  periodIndex: number,
  now: Date,
): ExamResult {
  const periodStart = new Date(cycleStart.getTime() + periodIndex * EXAM_PERIOD_MS);
  const periodEnd = new Date(periodStart.getTime() + EXAM_PERIOD_MS);
  const periodDecisions = getDecisionsForPeriod(progress.decisions, periodStart, periodEnd);
  const attended = periodDecisions.filter((decision) => decision.decision === "attended");
  const skipped = periodDecisions.filter((decision) => decision.decision === "skipped");
  const quantitativeScore = calculateCategoryExamScore(progress, periodDecisions, "quantitative");
  const verbalScore = calculateCategoryExamScore(progress, periodDecisions, "verbal");
  const academicAverage = getAcademicAverage(progress);
  const attendancePreparation = calculateAttendancePreparation(attended.length, skipped.length);
  const directionBonus = getDirectionBonus(progress, quantitativeScore, verbalScore);
  const variance = getStableVariance(`${progress.characterId}:${getExamPeriodKey(cycleStart, periodIndex)}`);
  const score = clampScore(
    Math.round(
      academicAverage * 0.45 +
        ((quantitativeScore + verbalScore) / 2) * 0.3 +
        attendancePreparation * 0.2 +
        directionBonus +
        variance,
    ),
  );
  const subjectSnapshots = createSubjectSnapshots(progress.subjectPerformances);
  const strongestSubject = findExtremeSubject(subjectSnapshots, "strongest");
  const weakestSubject = findExtremeSubject(subjectSnapshots, "weakest");

  return {
    id: crypto.randomUUID(),
    periodKey: getExamPeriodKey(cycleStart, periodIndex),
    periodStartAt: toStoredTimestamp(periodStart),
    periodEndAt: toStoredTimestamp(periodEnd),
    processedAt: toStoredTimestamp(now),
    score,
    grade: getExamGrade(score),
    quantitativeScore,
    verbalScore,
    academicAverage,
    classesAttended: attended.length,
    classesSkipped: skipped.length,
    strongestSubjectId: strongestSubject?.subjectId,
    weakestSubjectId: weakestSubject?.subjectId,
    subjectSnapshots,
    acknowledged: false,
  };
}

function calculateCategoryExamScore(
  progress: EducationProgress,
  periodDecisions: ClassDecision[],
  category: SubjectCategory,
): number {
  const categoryAverage = getCategoryAverage(progress, category);
  const categoryDecisions = periodDecisions.filter((decision) => findSubjectById(decision.subjectId)?.category === category);
  const attended = categoryDecisions.filter((decision) => decision.decision === "attended").length;
  const skipped = categoryDecisions.filter((decision) => decision.decision === "skipped").length;
  const preparationScore = calculateAttendancePreparation(attended, skipped);

  return clampScore(Math.round(categoryAverage * 0.72 + preparationScore * 0.28));
}

function calculateAttendancePreparation(attended: number, skipped: number): number {
  const targetAttendance = 12;
  const attendanceScore = Math.min(100, (attended / targetAttendance) * 100);
  const skipPenalty = skipped * 7;

  return clampScore(Math.round(attendanceScore - skipPenalty));
}

function getDirectionBonus(progress: EducationProgress, quantitativeScore: number, verbalScore: number): number {
  if (progress.academicDirection === "quantitative") {
    return quantitativeScore >= verbalScore ? 3 : 0;
  }

  if (progress.academicDirection === "verbal") {
    return verbalScore >= quantitativeScore ? 3 : 0;
  }

  if (progress.academicDirection === "balanced") {
    return Math.abs(quantitativeScore - verbalScore) <= 10 ? 3 : 0;
  }

  return 0;
}

function getDecisionsForPeriod(decisions: ClassDecision[], periodStart: Date, periodEnd: Date): ClassDecision[] {
  return decisions.filter((decision) => {
    const decidedAt = new Date(decision.decidedAt).getTime();
    return decidedAt >= periodStart.getTime() && decidedAt < periodEnd.getTime();
  });
}

function createSubjectSnapshots(
  subjectPerformances: Record<string, SubjectPerformance>,
): ExamSubjectSnapshot[] {
  return subjects.map((subject) => ({
    subjectId: subject.id,
    score: subjectPerformances[subject.id]?.score ?? 0,
  }));
}

function findExtremeSubject(
  snapshots: ExamSubjectSnapshot[],
  mode: "strongest" | "weakest",
): ExamSubjectSnapshot | undefined {
  return snapshots.reduce<ExamSubjectSnapshot | undefined>((selectedSnapshot, snapshot) => {
    if (!selectedSnapshot) {
      return snapshot;
    }

    return mode === "strongest"
      ? snapshot.score > selectedSnapshot.score ? snapshot : selectedSnapshot
      : snapshot.score < selectedSnapshot.score ? snapshot : selectedSnapshot;
  }, undefined);
}

function getExamPeriodKey(cycleStart: Date, periodIndex: number): string {
  return `${cycleStart.toISOString().slice(0, 10)}:exam-${periodIndex + 1}`;
}

function getStableVariance(seed: string): number {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }

  return (hash % 7) - 3;
}
