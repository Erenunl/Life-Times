import type { Character, FormattedGameDate } from "../types/game";
import { getCharacterDisplayName } from "../features/character/createCharacter";

type HeaderProps = {
  character: Character;
  gameDate: FormattedGameDate;
};

export function Header({ character, gameDate }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-block">
        <span className="brand-mark">L&T</span>
        <div>
          <h1>Life & Times</h1>
          <p>Persistent life simulation prototype</p>
        </div>
      </div>

      <dl className="status-strip" aria-label="Player status">
        <div>
          <dt>Date</dt>
          <dd>{gameDate.formatted}</dd>
        </div>
        <div>
          <dt>Player</dt>
          <dd>{getCharacterDisplayName(character)}</dd>
        </div>
        <div>
          <dt>Money</dt>
          <dd>${character.money.toLocaleString()}</dd>
        </div>
      </dl>
    </header>
  );
}
