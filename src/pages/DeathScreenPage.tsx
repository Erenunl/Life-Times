import { getCharacterDisplayName } from "../features/character/createCharacter";
import type { Character } from "../types/game";
import { formatStoredDate } from "../utils/realTime";

type DeathScreenPageProps = {
  character: Character;
  onStartNewLife: () => void;
};

export function DeathScreenPage({ character, onStartNewLife }: DeathScreenPageProps) {
  return (
    <div className="app-shell death-shell">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-mark">L&T</span>
          <div>
            <h1>Life & Times</h1>
            <p>Character record</p>
          </div>
        </div>
      </header>

      <main className="content-shell">
        <section className="death-panel">
          <h2>Your character has died.</h2>
          <div className="death-record">
            {character.profileImage ? (
              <img src={character.profileImage.dataUrl} alt={`${getCharacterDisplayName(character)} profile`} />
            ) : (
              <span>No photo</span>
            )}
            <dl>
              <div>
                <dt>Name</dt>
                <dd>{getCharacterDisplayName(character)}</dd>
              </div>
              <div>
                <dt>Age at death</dt>
                <dd>{character.ageAtDeath ?? "Unknown"}</dd>
              </div>
              <div>
                <dt>Date of death</dt>
                <dd>{character.diedAt ? formatStoredDate(character.diedAt) : "Unknown"}</dd>
              </div>
              <div>
                <dt>Reason</dt>
                <dd>This character was inactive for more than 90 real-world days.</dd>
              </div>
            </dl>
          </div>
          <p className="muted">
            This death is permanent. The character record is preserved for future history and legacy systems, but this
            character cannot continue gameplay.
          </p>
          <button type="button" onClick={onStartNewLife}>
            Start a New Life
          </button>
        </section>
      </main>
    </div>
  );
}
