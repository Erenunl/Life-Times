import type { AppLanguage } from "../i18n/language";
import { languageNames } from "../i18n/language";

type LanguageSwitchProps = {
  language: AppLanguage;
  onLanguageChange: (language: AppLanguage) => void;
  label: string;
};

export function LanguageSwitch({ language, onLanguageChange, label }: LanguageSwitchProps) {
  return (
    <div className="language-switch" aria-label={label}>
      <span>{label}</span>
      {(["en", "tr"] as AppLanguage[]).map((option) => (
        <button
          key={option}
          type="button"
          className={language === option ? "active" : ""}
          aria-pressed={language === option}
          onClick={() => onLanguageChange(option)}
        >
          {languageNames[option]}
        </button>
      ))}
    </div>
  );
}
