import { Navigate, Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { MainNavigation } from "../components/MainNavigation";
import {
  acknowledgeEducationExam,
  loadOrInitializeEducationProgress,
} from "../features/education/educationProgress";
import { getUnacknowledgedExam } from "../features/education/examSystem";
import { findSubjectById } from "../data/subjects";
import type { AppLanguage } from "../i18n/language";
import type { Character, EducationProgress, FormattedGameDate } from "../types/game";
import { getGameDate } from "../utils/gameTime";

export type AppOutletContext = {
  character: Character;
  educationProgress: EducationProgress;
  gameDate: FormattedGameDate;
  onEducationProgressChange: (progress: EducationProgress) => void;
};

type MainLayoutProps = {
  character: Character | null;
  educationProgress: EducationProgress | null;
  language: AppLanguage;
  onEducationProgressChange: (progress: EducationProgress) => void;
  onLanguageChange: (language: AppLanguage) => void;
};

export function MainLayout({
  character,
  educationProgress,
  language,
  onEducationProgressChange,
  onLanguageChange,
}: MainLayoutProps) {
  const gameDate = getGameDate();

  if (!character) {
    return <Navigate to="/create-character" replace />;
  }

  const activeEducationProgress = educationProgress ?? loadOrInitializeEducationProgress(character.id);
  const unacknowledgedExam = getUnacknowledgedExam(activeEducationProgress);

  function handleAcknowledgeExam() {
    if (!unacknowledgedExam) {
      return;
    }

    onEducationProgressChange(acknowledgeEducationExam(activeEducationProgress, unacknowledgedExam.id));
  }

  return (
    <div className="app-shell">
      <Header character={character} gameDate={gameDate} language={language} onLanguageChange={onLanguageChange} />
      <MainNavigation />
      <main className="content-shell">
        <Outlet
          context={{
            character,
            educationProgress: activeEducationProgress,
            gameDate,
            onEducationProgressChange,
          }}
        />
      </main>
      {unacknowledgedExam ? (
        <div className="modal-backdrop" role="presentation">
          <section className="exam-modal" role="dialog" aria-modal="true" aria-labelledby="exam-modal-title">
            <h2 id="exam-modal-title">Your character took the biweekly exam.</h2>
            <dl className="exam-result-grid">
              <div>
                <dt>Score</dt>
                <dd>{unacknowledgedExam.score}</dd>
              </div>
              <div>
                <dt>Grade</dt>
                <dd>{unacknowledgedExam.grade}</dd>
              </div>
              <div>
                <dt>Quantitative</dt>
                <dd>{unacknowledgedExam.quantitativeScore}</dd>
              </div>
              <div>
                <dt>Verbal</dt>
                <dd>{unacknowledgedExam.verbalScore}</dd>
              </div>
            </dl>
            <p>
              Strongest subject: {findSubjectById(unacknowledgedExam.strongestSubjectId ?? "")?.name ?? "N/A"}.
              {" "}Weakest subject: {findSubjectById(unacknowledgedExam.weakestSubjectId ?? "")?.name ?? "N/A"}.
            </p>
            <button type="button" onClick={handleAcknowledgeExam}>
              Acknowledge
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );
}
