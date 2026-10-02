import type { Character, FormattedGameDate } from "../types/game";
import { getCharacterDisplayName } from "../features/character/createCharacter";
import { LanguageSwitch } from "./LanguageSwitch";
import type { AppLanguage } from "../i18n/language";
import { commonCopy } from "../i18n/language";

type HeaderProps = {
  character: Character;
  gameDate: FormattedGameDate;
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
};

export function Header({ character, gameDate, language, onLanguageChange }: HeaderProps) {
  const copy = commonCopy[language];

  return (
    <header className="app-header">
      <div className="brand-block">
        <span className="brand-mark">L&T</span>
        <div>
          <h1>Life & Times</h1>
          <p>{copy.persistentTagline}</p>
        </div>
      </div>

      <div className="header-actions">
        <LanguageSwitch language={language} onLanguageChange={onLanguageChange} label={copy.languageLabel} />
        <dl className="status-strip" aria-label={copy.playerStatus}>
          <div>
            <dt>{copy.date}</dt>
            <dd>{gameDate.formatted}</dd>
          </div>
          <div>
            <dt>{copy.player}</dt>
            <dd>{getCharacterDisplayName(character)}</dd>
          </div>
          <div>
            <dt>{copy.money}</dt>
            <dd>${character.money.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
