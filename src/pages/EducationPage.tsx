import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { MAX_DAILY_CLASS_SESSIONS } from "../config/educationRules";
import { findHighSchoolById } from "../data/schools";
import { findSubjectById, getSubjectsByIds } from "../data/subjects";
import {
  recordClassAttendance,
  recordClassSkip,
  selectAcademicDirection,
} from "../features/education/educationProgress";
import {
  getAcademicAverage,
  getAttendancePercentage,
  getCategoryAverage,
  getDirectionLabel,
  getLetterGrade,
  getSubjectScore,
  sortSubjectsForDisplay,
} from "../features/education/educationUtils";
import type { AppOutletContext } from "../layouts/MainLayout";
import type { AcademicDirection } from "../types/game";
import { calculateAge } from "../utils/gameTime";
import {
  canTakeClassToday,
  canTakeNextClass,
  formatCooldown,
  formatRealTime,
  formatStoredDate,
  getClassesCompletedToday,
  getCurrentRealTime,
  getNextClassAvailableAt,
  getRemainingClassCooldown,
} from "../utils/realTime";

const academicDirections: Array<{
  id: AcademicDirection;
  title: string;
  description: string;
}> = [
  {
    id: "quantitative",
    title: "Quantitative / STEM Focus",
    description: "More Mathematics, Physics, Chemistry, and Computer Science. Best for future technical paths.",
  },
  {
    id: "verbal",
    title: "Verbal / Humanities Focus",
    description: "More Literature, History, Social Studies, and Psychology. Best for future social and humanities paths.",
  },
  {
    id: "balanced",
    title: "Balanced",
    description: "A broader mix of quantitative and verbal subjects with less specialization.",
  },
];

export function EducationPage() {
  const { character, educationProgress, gameDate, onEducationProgressChange } = useOutletContext<AppOutletContext>();
  const [now, setNow] = useState(() => getCurrentRealTime());
  const [selectedDirection, setSelectedDirection] = useState<AcademicDirection | "">("");
  const school = findHighSchoolById(educationProgress.schoolId);
  const age = calculateAge(gameDate, character.birthDate);
  const nextSubject = educationProgress.currentOfferedSubjectId
    ? findSubjectById(educationProgress.currentOfferedSubjectId)
    : undefined;
  const classesToday = getClassesCompletedToday(educationProgress, now);
  const canTakeClass = canTakeNextClass(educationProgress, now);
  const canTakeAnyClassToday = canTakeClassToday(educationProgress, now);
  const remainingCooldown = getRemainingClassCooldown(educationProgress, now);
  const nextAvailableAt = getNextClassAvailableAt(educationProgress);
  const curriculumSubjects = sortSubjectsForDisplay(getSubjectsByIds([...new Set(educationProgress.curriculumSubjectIds)]));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(getCurrentRealTime());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  function handleDirectionConfirm() {
    if (!selectedDirection) {
      return;
    }

    onEducationProgressChange(selectAcademicDirection(educationProgress, selectedDirection, now));
  }

  function handleAttendClass() {
    if (!canTakeClass) {
      return;
    }

    onEducationProgressChange(recordClassAttendance(educationProgress, now));
    setNow(getCurrentRealTime());
  }

  function handleSkipClass() {
    if (!canTakeClass) {
      return;
    }

    onEducationProgressChange(recordClassSkip(educationProgress, now));
    setNow(getCurrentRealTime());
  }

  if (!educationProgress.academicDirection) {
    return (
      <div className="school-page">
        <section className="school-panel direction-choice-panel">
          <h2>Choose Academic Direction</h2>
          <p>
            This decision sets your high-school curriculum and academic history. It will later influence university
            options, scholarships, career paths, and long-term opportunities. For this version, it is permanent.
          </p>
          <div className="direction-options">
            {academicDirections.map((direction) => (
              <label key={direction.id} className="direction-option">
                <input
                  type="radio"
                  name="academicDirection"
                  value={direction.id}
                  checked={selectedDirection === direction.id}
                  onChange={() => setSelectedDirection(direction.id)}
                />
                <span>
                  <strong>{direction.title}</strong>
                  <small>{direction.description}</small>
                </span>
              </label>
            ))}
          </div>
          <button type="button" disabled={!selectedDirection} onClick={handleDirectionConfirm}>
            Confirm Direction
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="school-page">
      <section className="school-panel school-overview">
        <h2>{school?.name ?? "High School"}</h2>
        <dl className="school-stat-grid">
          <div>
            <dt>Age</dt>
            <dd>{age}</dd>
          </div>
          <div>
            <dt>Stage</dt>
            <dd>High School Student</dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{getDirectionLabel(educationProgress.academicDirection)}</dd>
          </div>
          <div>
            <dt>Quantitative</dt>
            <dd>{getCategoryAverage(educationProgress, "quantitative")}%</dd>
          </div>
          <div>
            <dt>Verbal</dt>
            <dd>{getCategoryAverage(educationProgress, "verbal")}%</dd>
          </div>
          <div>
            <dt>Academic avg.</dt>
            <dd>{getAcademicAverage(educationProgress)}%</dd>
          </div>
          <div>
            <dt>Attendance</dt>
            <dd>{getAttendancePercentage(educationProgress)}%</dd>
          </div>
          <div>
            <dt>Today</dt>
            <dd>{classesToday} / {MAX_DAILY_CLASS_SESSIONS}</dd>
          </div>
          <div>
            <dt>This week</dt>
            <dd>{educationProgress.weeklyAttended} attended, {educationProgress.weeklySkipped} skipped</dd>
          </div>
        </dl>
      </section>

      <section className="school-panel class-panel">
        <h2>Next Class</h2>
        <p className="next-subject">{nextSubject?.name ?? "No class available"}</p>
        {!canTakeAnyClassToday ? (
          <p className="school-status">School day completed. Come back tomorrow.</p>
        ) : canTakeClass ? (
          <div className="class-actions">
            <button type="button" onClick={handleAttendClass}>Attend Class</button>
            <button type="button" className="secondary-button" onClick={handleSkipClass}>Skip Class</button>
          </div>
        ) : (
          <p className="school-status">
            Next class available in {formatCooldown(remainingCooldown)}
            {nextAvailableAt ? `, at ${formatRealTime(nextAvailableAt)}` : ""}.
          </p>
        )}
      </section>

      <section className="school-panel">
        <h2>Subjects and Grades</h2>
        <table className="school-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Category</th>
              <th>Score</th>
              <th>Grade</th>
            </tr>
          </thead>
          <tbody>
            {curriculumSubjects.map((subject) => {
              const score = getSubjectScore(educationProgress, subject.id);
              return (
                <tr key={subject.id}>
                  <td>{subject.name}</td>
                  <td>{subject.category}</td>
                  <td>{score}%</td>
                  <td>{getLetterGrade(score)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="school-panel">
        <h2>Exam History</h2>
        {educationProgress.examHistory.length > 0 ? (
          <table className="school-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Quantitative</th>
                <th>Verbal</th>
              </tr>
            </thead>
            <tbody>
              {educationProgress.examHistory.slice(0, 8).map((exam) => (
                <tr key={exam.id}>
                  <td>{formatStoredDate(exam.periodEndAt)}</td>
                  <td>{exam.score}</td>
                  <td>{exam.grade}</td>
                  <td>{exam.quantitativeScore}</td>
                  <td>{exam.verbalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No biweekly exams have been processed yet.</p>
        )}
      </section>

      <section className="school-panel">
        <h2>Recent Education Events</h2>
        <ul className="event-list">
          {educationProgress.events.map((event) => (
            <li key={event.id}>
              <strong>{formatStoredDate(event.createdAt)}</strong>
              <span>{event.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
