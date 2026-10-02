import { useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { CreateCharacterPage } from "./pages/CreateCharacterPage";
import { DeathScreenPage } from "./pages/DeathScreenPage";
import { EducationPage } from "./pages/EducationPage";
import { ForumsPage } from "./pages/ForumsPage";
import { HomePage } from "./pages/HomePage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { SocialPage } from "./pages/SocialPage";
import {
  markCharacterActive,
  prepareCharacterForGameEntry,
} from "./features/character/characterLifecycle";
import { loadOrInitializeEducationProgress } from "./features/education/educationProgress";
import {
  archiveDeceasedCharacter,
  deleteCharacter,
  loadCharacter,
  saveCharacter,
} from "./services/storage/characterStorage";
import type { Character, EducationProgress } from "./types/game";
import type { AppLanguage } from "./i18n/language";
import { loadStoredLanguage, saveStoredLanguage } from "./i18n/language";

const placeholderRoutes = [
  { path: "/character", title: "Character", description: "Character creation and personal details will live here." },
  { path: "/city", title: "City", description: "City locations, travel, and local activity will be added here." },
  { path: "/career", title: "Career", description: "Jobs, promotions, earnings, and career reputation will appear here." },
];

export default function App() {
  const [language, setLanguage] = useState<AppLanguage>(() => loadStoredLanguage());
  const [character, setCharacter] = useState<Character | null>(() => {
    const storedCharacter = loadCharacter();

    if (!storedCharacter) {
      return null;
    }

    const result = prepareCharacterForGameEntry(storedCharacter);
    saveCharacter(result.character);
    return result.character;
  });
  const [educationProgress, setEducationProgress] = useState<EducationProgress | null>(() =>
    character && !character.isDeceased ? loadOrInitializeEducationProgress(character.id) : null,
  );

  function handleCharacterCreated(createdCharacter: Character) {
    saveCharacter(createdCharacter);
    setCharacter(createdCharacter);
    setEducationProgress(loadOrInitializeEducationProgress(createdCharacter.id));
  }

  function handleEducationProgressChange(updatedProgress: EducationProgress) {
    setEducationProgress(updatedProgress);

    if (!character || character.isDeceased) {
      return;
    }

    const activeCharacter = markCharacterActive(character);
    saveCharacter(activeCharacter);
    setCharacter(activeCharacter);
  }

  function handleLanguageChange(nextLanguage: AppLanguage) {
    saveStoredLanguage(nextLanguage);
    setLanguage(nextLanguage);
  }

  function handleStartNewLife() {
    if (character?.isDeceased) {
      archiveDeceasedCharacter(character);
    }

    deleteCharacter();
    setCharacter(null);
    setEducationProgress(null);
  }

  if (character?.isDeceased) {
    return (
      <HashRouter>
        <Routes>
          <Route
            path="*"
            element={<DeathScreenPage character={character} onStartNewLife={handleStartNewLife} />}
          />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/create-character"
          element={
            <CreateCharacterPage
              character={character}
              language={language}
              onCharacterCreated={handleCharacterCreated}
              onLanguageChange={handleLanguageChange}
            />
          }
        />
        <Route
          element={
            <MainLayout
              character={character}
              educationProgress={educationProgress}
              language={language}
              onEducationProgressChange={handleEducationProgressChange}
              onLanguageChange={handleLanguageChange}
            />
          }
        >
          <Route index element={<HomePage />} />
          <Route path="/education" element={<EducationPage />} />
          <Route path="/social" element={<SocialPage />} />
          <Route path="/forums" element={<ForumsPage />} />
          {placeholderRoutes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<PlaceholderPage title={route.title} description={route.description} />}
            />
          ))}
        </Route>
      </Routes>
    </HashRouter>
  );
}
