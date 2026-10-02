import { useOutletContext } from "react-router-dom";
import { Panel } from "../components/Panel";
import { MAX_DAILY_CLASS_SESSIONS } from "../config/educationRules";
import { findCityById } from "../data/cities";
import { findHighSchoolById } from "../data/schools";
import { findSubjectById } from "../data/subjects";
import { quickActions, recentEvents } from "../data/mockPlayer";
import { getCharacterDisplayName } from "../features/character/createCharacter";
import {
  getAcademicAverage,
  getAttendancePercentage,
  getDirectionLabel,
} from "../features/education/educationUtils";
import { getUnacknowledgedExam } from "../features/education/examSystem";
import type { AppOutletContext } from "../layouts/MainLayout";
import { calculateAge, formatGameDate } from "../utils/gameTime";
import {
  canTakeNextClass,
  formatCooldown,
  getClassesCompletedToday,
  getRemainingClassCooldown,
} from "../utils/realTime";

export function HomePage() {
  const { character, educationProgress, gameDate } = useOutletContext<AppOutletContext>();
  const { career, education, energy, mood } = character;
  const city = findCityById(character.cityId);
  const age = calculateAge(gameDate, character.birthDate);
  const school = findHighSchoolById(educationProgress.schoolId);
  const nextSubject = educationProgress.currentOfferedSubjectId
    ? findSubjectById(educationProgress.currentOfferedSubjectId)
    : undefined;
  const classesToday = getClassesCompletedToday(educationProgress);
  const cooldown = getRemainingClassCooldown(educationProgress);
  const nextClassStatus = canTakeNextClass(educationProgress)
    ? nextSubject?.name ?? "Choose academic direction"
    : classesToday >= MAX_DAILY_CLASS_SESSIONS
      ? "School day completed"
      : `Available in ${formatCooldown(cooldown)}`;
  const unacknowledgedExam = getUnacknowledgedExam(educationProgress);
  const educationLabel = education.level === "high-school" && education.status === "student"
    ? "High School Student"
    : education.status;

  return (
    <div className="dashboard-grid">
      <Panel title="Character Summary">
        <div className="summary-profile">
          {character.profileImage ? (
            <img src={character.profileImage.dataUrl} alt={`${getCharacterDisplayName(character)} profile`} />
          ) : (
            <span>No photo</span>
          )}
          <div>
            <strong>{getCharacterDisplayName(character)}</strong>
            <span>Age {age}</span>
          </div>
        </div>
        <dl className="data-list">
          <div>
            <dt>Birth date</dt>
            <dd>{formatGameDate(character.birthDate)}</dd>
          </div>
          <div>
            <dt>Mood</dt>
            <dd>{mood}%</dd>
          </div>
          <div>
            <dt>Energy</dt>
            <dd>{energy}%</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Current Location">
        <p className="summary-line">{city ? `${city.name}, ${city.country}` : "Unknown city"}</p>
        <p className="muted">A mid-sized city with schools, workplaces, venues, and forums planned.</p>
      </Panel>

      <Panel title="Education">
        {unacknowledgedExam ? (
          <p className="notice-line">New exam result available: {unacknowledgedExam.score} — {unacknowledgedExam.grade}</p>
        ) : null}
        <dl className="data-list">
          <div>
            <dt>Status</dt>
            <dd>{educationLabel}</dd>
          </div>
          <div>
            <dt>School</dt>
            <dd>{school?.name ?? education.institutionName}</dd>
          </div>
          <div>
            <dt>Direction</dt>
            <dd>{getDirectionLabel(educationProgress.academicDirection)}</dd>
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
            <dt>Classes today</dt>
            <dd>{classesToday} / {MAX_DAILY_CLASS_SESSIONS}</dd>
          </div>
          <div>
            <dt>This week</dt>
            <dd>{educationProgress.weeklyAttended} attended</dd>
          </div>
          <div>
            <dt>Next class</dt>
            <dd>{nextClassStatus}</dd>
          </div>
        </dl>
        <a className="panel-link" href="#/education">Go to School</a>
      </Panel>

      <Panel title="Career">
        <dl className="data-list">
          <div>
            <dt>Role</dt>
            <dd>{career.title}</dd>
          </div>
          <div>
            <dt>Employer</dt>
            <dd>{career.employer ?? "None"}</dd>
          </div>
          <div>
            <dt>Weekly income</dt>
            <dd>${career.weeklyIncome}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Recent Events">
        <ul className="event-list">
          {recentEvents.map((event) => (
            <li key={event.id}>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Quick Actions">
        <div className="action-grid">
          {quickActions.map((action) => (
            <button key={action.id} type="button">
              {action.label}
            </button>
          ))}
        </div>
      </Panel>
    </div>
  );
}
