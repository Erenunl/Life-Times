import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  STARTING_AGE,
  STARTING_LIFE_STAGE,
  STARTING_MONEY,
} from "../config/gameRules";
import { cities } from "../data/cities";
import { createCharacter } from "../features/character/createCharacter";
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
  onCharacterCreated: (character: Character) => void;
};

type FormErrors = Partial<{
  firstName: string;
  lastName: string;
  gender: string;
  biography: string;
  cityId: string;
  profileImage: string;
}>;

export function CreateCharacterPage({ character, onCharacterCreated }: CreateCharacterPageProps) {
  const navigate = useNavigate();
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
        profileImage: error instanceof Error ? error.message : "The selected image could not be used.",
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
      validationErrors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      validationErrors.lastName = "Last name is required.";
    }

    if (!gender) {
      validationErrors.gender = "Choose a gender option.";
    }

    if (biography.length > BIOGRAPHY_MAX_LENGTH) {
      validationErrors.biography = `Biography must be ${BIOGRAPHY_MAX_LENGTH} characters or fewer.`;
    }

    if (!cities.some((city) => city.id === cityId)) {
      validationErrors.cityId = "Choose a starting city.";
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
            <p>Create your local player profile</p>
          </div>
        </div>
        <dl className="status-strip" aria-label="Starting rules">
          <div>
            <dt>Age</dt>
            <dd>{STARTING_AGE}</dd>
          </div>
          <div>
            <dt>Life stage</dt>
            <dd>High School</dd>
          </div>
          <div>
            <dt>Money</dt>
            <dd>${STARTING_MONEY.toLocaleString()}</dd>
          </div>
        </dl>
      </header>

      <main className="content-shell">
        <form className="creation-layout" onSubmit={handleSubmit} noValidate>
          <section className="creation-panel profile-panel">
            <h2>Profile Photo</h2>
            <div className="portrait-preview">
              {profileImage ? (
                <img src={profileImage.dataUrl} alt="Profile preview" />
              ) : (
                <span>No photo</span>
              )}
            </div>
            <label className="file-control">
              Upload JPEG, PNG, or WebP
              <input
                type="file"
                accept={ALLOWED_PROFILE_IMAGE_TYPES.join(",")}
                onChange={handleProfileImageChange}
              />
            </label>
            <p className="muted">
              Max size: {Math.round(MAX_PROFILE_IMAGE_BYTES / 1024 / 1024)} MB. Images are cropped to 512x512 locally.
            </p>
            {isProcessingImage ? <p className="field-note">Processing image...</p> : null}
            {errors.profileImage ? <p className="field-error">{errors.profileImage}</p> : null}
          </section>

          <section className="creation-panel">
            <h2>Character Information</h2>
            <div className="form-grid">
              <label>
                First name
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                {errors.firstName ? <span className="field-error">{errors.firstName}</span> : null}
              </label>

              <label>
                Last name
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
                {errors.lastName ? <span className="field-error">{errors.lastName}</span> : null}
              </label>

              <label>
                Gender
                <select value={gender} onChange={(event) => setGender(event.target.value as Gender | "")}>
                  <option value="">Choose...</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="unspecified">Prefer not to say</option>
                </select>
                {errors.gender ? <span className="field-error">{errors.gender}</span> : null}
              </label>

              <label>
                Starting city
                <select value={cityId} onChange={(event) => setCityId(event.target.value)}>
                  <option value="">Choose...</option>
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
                <dt>Generated birth date</dt>
                <dd>{formatGameDate(generatedBirthDate)}</dd>
              </div>
              <div>
                <dt>Education status</dt>
                <dd>High School Student</dd>
              </div>
              <div>
                <dt>Starting stage</dt>
                <dd>{STARTING_LIFE_STAGE === "high-school" ? "High School" : STARTING_LIFE_STAGE}</dd>
              </div>
            </dl>
          </section>

          <section className="creation-panel biography-panel">
            <h2>Biography</h2>
            <label>
              Short biography
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
            <h2>Begin</h2>
            <p>
              Life & Times begins at sixteen, during high school. The choices from this phase will matter more as
              education, friendships, reputation, and career systems grow.
            </p>
            <button type="submit" disabled={isProcessingImage}>
              Create Character
            </button>
          </section>
        </form>
      </main>
    </div>
  );
}
