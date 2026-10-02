import type { AcademicDirection, SubjectDefinition } from "../types/game";

export const subjects: SubjectDefinition[] = [
  { id: "subject-mathematics", name: "Mathematics", category: "quantitative" },
  { id: "subject-physics", name: "Physics", category: "quantitative" },
  { id: "subject-chemistry", name: "Chemistry", category: "quantitative" },
  { id: "subject-computer-science", name: "Computer Science", category: "quantitative" },
  { id: "subject-literature", name: "Literature", category: "verbal" },
  { id: "subject-history", name: "History", category: "verbal" },
  { id: "subject-social-studies", name: "Social Studies", category: "verbal" },
  { id: "subject-psychology", name: "Psychology", category: "verbal" },
  { id: "subject-english", name: "English", category: "general" },
  { id: "subject-physical-education", name: "Physical Education", category: "general" },
];

export const curriculumByDirection: Record<AcademicDirection, string[]> = {
  quantitative: [
    "subject-mathematics",
    "subject-physics",
    "subject-computer-science",
    "subject-chemistry",
    "subject-mathematics",
    "subject-computer-science",
    "subject-english",
    "subject-literature",
    "subject-physical-education",
  ],
  verbal: [
    "subject-literature",
    "subject-history",
    "subject-social-studies",
    "subject-psychology",
    "subject-literature",
    "subject-history",
    "subject-english",
    "subject-mathematics",
    "subject-physical-education",
  ],
  balanced: [
    "subject-mathematics",
    "subject-literature",
    "subject-physics",
    "subject-history",
    "subject-computer-science",
    "subject-social-studies",
    "subject-english",
    "subject-chemistry",
    "subject-psychology",
    "subject-physical-education",
  ],
};

export function findSubjectById(subjectId: string): SubjectDefinition | undefined {
  return subjects.find((subject) => subject.id === subjectId);
}

export function getSubjectsByIds(subjectIds: string[]): SubjectDefinition[] {
  return subjectIds.flatMap((subjectId) => {
    const subject = findSubjectById(subjectId);
    return subject ? [subject] : [];
  });
}
