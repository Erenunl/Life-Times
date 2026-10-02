import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  STARTING_AGE,
  STARTING_LIFE_STAGE,
  STARTING_MONEY,
} from "../config/gameRules";
import { LanguageSwitch } from "../components/LanguageSwitch";
import { cities } from "../data/cities";
import { createCharacter } from "../features/character/createCharacter";
import type { AppLanguage } from "../i18n/language";
import { commonCopy, createCharacterCopy } from "../i18n/language";
import type { Character, Gender, ProfileImage } from "../types/game";
import { formatGameDate, getBirthDateForAge, getGameDate } from "../utils/gameTime";
import {
  ALLOWED_PROFILE_IMAGE_TYPES,
  MAX_PROFILE_IMAGE_BYTES,
  processProfileImage,
} from "../utils/profileImage";

const BIOGRAPHY_MAX_LENGTH = 500;

type CreateCharacterPageProps = {
  character: Character | null;
  language: AppLanguage;
  onCharacterCreated: (character: Character) => void;
  onLanguageChange: (language: AppLanguage) => void;
};

type FormErrors = Partial<{
  firstName: string;
  lastName: string;
  gender: string;
  biography: string;
  cityId: string;
  profileImage: string;
}>;

export function CreateCharacterPage({
  character,
  language,
  onCharacterCreated,
  onLanguageChange,
}: CreateCharacterPageProps) {
  const navigate = useNavigate();
  const copy = createCharacterCopy[language];
  const headerCopy = commonCopy[language];
  const currentGameDate = useMemo(() => getGameDate(), []);
  const generatedBirthDate = getBirthDateForAge(currentGameDate, STARTING_AGE);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [biography, setBiography] = useState("");
  const [cityId, setCityId] = useState("");
  const [profileImage, setProfileImage] = useState<ProfileImage | undefined>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  if (character) {
    return <Navigate to="/" replace />;
  }

  async function handleProfileImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setErrors((currentErrors) => ({ ...currentErrors, profileImage: undefined }));
    setProfileImage(undefined);

    if (!file) {
      return;
    }

    setIsProcessingImage(true);

    try {
      const processedImage = await processProfileImage(file);
      setProfileImage(processedImage);
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        profileImage: error instanceof Error ? error.message : copy.imageError,
      }));
    } finally {
      setIsProcessingImage(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    const createdCharacter = createCharacter({
      firstName,
      lastName,
      gender: gender as Gender,
      biography,
      cityId,
      profileImage,
      currentGameDate,
    });

    onCharacterCreated(createdCharacter);
    navigate("/", { replace: true });
  }

  function validateForm(): FormErrors {
    const validationErrors: FormErrors = {};

    if (!firstName.trim()) {
      validationErrors.firstName = copy.firstNameRequired;
    }

    if (!lastName.trim()) {
      validationErrors.lastName = copy.lastNameRequired;
    }

    if (!gender) {
      validationErrors.gender = copy.genderRequired;
    }

    if (biography.length > BIOGRAPHY_MAX_LENGTH) {
      validationErrors.biography = copy.biographyTooLong.replace("{limit}", String(BIOGRAPHY_MAX_LENGTH));
    }

    if (!cities.some((city) => city.id === cityId)) {
      validationErrors.cityId = copy.cityRequired;
    }

    return validationErrors;
  }

  return (
    <div className="app-shell create-shell">
      <header className="app-header">
        <div className="brand-block">
          <span className="brand-mark">L&T</span>
          <div>
            <h1>Life & Times</h1>
            <p>{copy.tagline}</p>
          </div>
        </div>
        <div className="header-actions">
          <LanguageSwitch language={language} onLanguageChange={onLanguageChange} label={headerCopy.languageLabel} />
          <dl className="status-strip" aria-label={copy.startingRules}>
            <div>
              <dt>{copy.age}</dt>
              <dd>{STARTING_AGE}</dd>
            </div>
            <div>
              <dt>{copy.lifeStage}</dt>
              <dd>{copy.highSchool}</dd>
            </div>
            <div>
              <dt>{headerCopy.money}</dt>
              <dd>${STARTING_MONEY.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="content-shell">
        <form className="creation-layout" onSubmit={handleSubmit} noValidate>
          <section className="creation-panel profile-panel">
            <h2>{copy.profilePhoto}</h2>
            <div className="portrait-preview">
              {profileImage ? (
                <img src={profileImage.dataUrl} alt={copy.profilePreviewAlt} />
              ) : (
                <span>{copy.noPhoto}</span>
              )}
            </div>
            <label className="file-control">
              {copy.uploadImage}
              <input
                type="file"
                accept={ALLOWED_PROFILE_IMAGE_TYPES.join(",")}
                onChange={handleProfileImageChange}
              />
            </label>
            <p className="muted">
              {copy.maxImageSize.replace("{size}", String(Math.round(MAX_PROFILE_IMAGE_BYTES / 1024 / 1024)))}
            </p>
            {isProcessingImage ? <p className="field-note">{copy.processingImage}</p> : null}
            {errors.profileImage ? <p className="field-error">{errors.profileImage}</p> : null}
          </section>

          <section className="creation-panel">
            <h2>{copy.characterInformation}</h2>
            <div className="form-grid">
              <label>
                {copy.firstName}
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                {errors.firstName ? <span className="field-error">{errors.firstName}</span> : null}
              </label>

              <label>
                {copy.lastName}
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                {errors.lastName ? <span className="field-error">{errors.lastName}</span> : null}
              </label>

              <label>
                {copy.gender}
                <select value={gender} onChange={(event) => setGender(event.target.value as Gender | "")}>
                  <option value="">{copy.choose}</option>
                  <option value="female">{copy.female}</option>
                  <option value="male">{copy.male}</option>
                  <option value="non-binary">{copy.nonBinary}</option>
                  <option value="unspecified">{copy.preferNotToSay}</option>
                </select>
                {errors.gender ? <span className="field-error">{errors.gender}</span> : null}
              </label>

              <label>
                {copy.startingCity}
                <select value={cityId} onChange={(event) => setCityId(event.target.value)}>
                  <option value="">{copy.choose}</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {errors.cityId ? <span className="field-error">{errors.cityId}</span> : null}
              </label>
            </div>

            <dl className="fixed-rules">
              <div>
                <dt>{copy.generatedBirthDate}</dt>
                <dd>{formatGameDate(generatedBirthDate)}</dd>
              </div>
              <div>
                <dt>{copy.educationStatus}</dt>
                <dd>{copy.highSchoolStudent}</dd>
              </div>
              <div>
                <dt>{copy.startingStage}</dt>
                <dd>{STARTING_LIFE_STAGE === "high-school" ? copy.highSchool : STARTING_LIFE_STAGE}</dd>
              </div>
            </dl>
          </section>

          <section className="creation-panel biography-panel">
            <h2>{copy.biography}</h2>
            <label>
              {copy.shortBiography}
              <textarea
                value={biography}
                maxLength={BIOGRAPHY_MAX_LENGTH}
                onChange={(event) => setBiography(event.target.value)}
                rows={8}
              />
            </label>
            <div className="counter-row">
              <span>{biography.length} / {BIOGRAPHY_MAX_LENGTH}</span>
              {errors.biography ? <span className="field-error">{errors.biography}</span> : null}
            </div>
          </section>

          <section className="creation-panel creation-actions">
            <h2>{copy.begin}</h2>
            <p>{copy.beginText}</p>
            <button type="submit" disabled={isProcessingImage}>
              {copy.createCharacter}
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}
