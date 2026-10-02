import { subjects } from "../../data/subjects";
import type { EducationProgress, SubjectCategory, SubjectDefinition } from "../../types/game";

export function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

export function getLetterGrade(score: number): string {
  if (score >= 90) {
    return "A";
  }

  if (score >= 80) {
    return "B";
  }

  if (score >= 70) {
    return "C";
  }

  if (score >= 60) {
    return "D";
  }

  return "F";
}

export function getExamGrade(score: number): string {
  if (score >= 90) {
    return "AA";
  }

  if (score >= 85) {
    return "BA";
  }

  if (score >= 80) {
    return "BB";
  }

  if (score >= 75) {
    return "CB";
  }

  if (score >= 70) {
    return "CC";
  }

  if (score >= 65) {
    return "DC";
  }

  if (score >= 60) {
    return "DD";
  }

  if (score >= 50) {
    return "FD";
  }

  return "FF";
}

export function getSubjectScore(progress: EducationProgress, subjectId: string): number {
  return progress.subjectPerformances[subjectId]?.score ?? 0;
}

export function getAcademicAverage(progress: EducationProgress): number {
  const performances = Object.values(progress.subjectPerformances);

  if (performances.length === 0) {
    return 0;
  }

  return roundScore(performances.reduce((total, performance) => total + performance.score, 0) / performances.length);
}

export function getCategoryAverage(progress: EducationProgress, category: SubjectCategory): number {
  const relevantSubjects = subjects.filter((subject) => subject.category === category);
  const relevantScores = relevantSubjects.flatMap((subject) => {
    const performance = progress.subjectPerformances[subject.id];
    return performance ? [performance.score] : [];
  });

  if (relevantScores.length === 0) {
    return 0;
  }

  return roundScore(relevantScores.reduce((total, score) => total + score, 0) / relevantScores.length);
}

export function getAttendancePercentage(progress: EducationProgress): number {
  const totalDecisions = progress.totalAttended + progress.totalSkipped;

  if (totalDecisions === 0) {
    return 100;
  }

  return Math.round((progress.totalAttended / totalDecisions) * 100);
}

export function getDirectionLabel(direction: EducationProgress["academicDirection"]): string {
  if (direction === "quantitative") {
    return "Quantitative / STEM";
  }

  if (direction === "verbal") {
    return "Verbal / Humanities";
  }

  if (direction === "balanced") {
    return "Balanced";
  }

  return "Not selected";
}

export function sortSubjectsForDisplay(subjectList: SubjectDefinition[]): SubjectDefinition[] {
  const order: SubjectCategory[] = ["quantitative", "verbal", "general"];

  return [...subjectList].sort((a, b) => {
    const categoryDifference = order.indexOf(a.category) - order.indexOf(b.category);
    return categoryDifference || a.name.localeCompare(b.name);
  });
}

function roundScore(score: number): number {
  return Math.round(score * 10) / 10;
}
