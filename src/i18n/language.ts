export type AppLanguage = "en" | "tr";

const LANGUAGE_STORAGE_KEY = "life-and-times-language";

export const languageNames: Record<AppLanguage, string> = {
  en: "English",
  tr: "Türkçe",
};

export function loadStoredLanguage(): AppLanguage {
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return storedLanguage === "tr" ? "tr" : "en";
}

export function saveStoredLanguage(language: AppLanguage): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

export const commonCopy = {
  en: {
    languageLabel: "Language",
    persistentTagline: "Persistent life simulation prototype",
    playerStatus: "Player status",
    date: "Date",
    player: "Player",
    money: "Money",
  },
  tr: {
    languageLabel: "Dil",
    persistentTagline: "Kalıcı yaşam simülasyonu prototipi",
    playerStatus: "Oyuncu durumu",
    date: "Tarih",
    player: "Oyuncu",
    money: "Para",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

export const createCharacterCopy = {
  en: {
    tagline: "Create your local player profile",
    startingRules: "Starting rules",
    age: "Age",
    lifeStage: "Life stage",
    highSchool: "High School",
    profilePhoto: "Profile Photo",
    noPhoto: "No photo",
    profilePreviewAlt: "Profile preview",
    uploadImage: "Upload JPEG, PNG, or WebP",
    maxImageSize: "Max size: {size} MB. Images are cropped to 512x512 locally.",
    processingImage: "Processing image...",
    imageError: "The selected image could not be used.",
    characterInformation: "Character Information",
    firstName: "First name",
    lastName: "Last name",
    gender: "Gender",
    choose: "Choose...",
    female: "Female",
    male: "Male",
    nonBinary: "Non-binary",
    preferNotToSay: "Prefer not to say",
    startingCity: "Starting city",
    generatedBirthDate: "Generated birth date",
    educationStatus: "Education status",
    highSchoolStudent: "High School Student",
    startingStage: "Starting stage",
    biography: "Biography",
    shortBiography: "Short biography",
    begin: "Begin",
    beginText:
      "Life & Times begins at sixteen, during high school. The choices from this phase will matter more as education, friendships, reputation, and career systems grow.",
    createCharacter: "Create Character",
    firstNameRequired: "First name is required.",
    lastNameRequired: "Last name is required.",
    genderRequired: "Choose a gender option.",
    biographyTooLong: "Biography must be {limit} characters or fewer.",
    cityRequired: "Choose a starting city.",
  },
  tr: {
    tagline: "Yerel oyuncu profilini oluştur",
    startingRules: "Başlangıç kuralları",
    age: "Yaş",
    lifeStage: "Yasam evresi",
    highSchool: "Lise",
    profilePhoto: "Profil Fotoğrafı",
    noPhoto: "Fotoğraf yok",
    profilePreviewAlt: "Profil önizlemesi",
    uploadImage: "JPEG, PNG veya WebP yükle",
    maxImageSize: "Maksimum boyut: {size} MB. Görseller yerel olarak 512x512 kırpılır.",
    processingImage: "Görsel işleniyor...",
    imageError: "Seçilen görsel kullanılamadı.",
    characterInformation: "Karakter Bilgileri",
    firstName: "Ad",
    lastName: "Soyad",
    gender: "Cinsiyet",
    choose: "Seç...",
    female: "Kadın",
    male: "Erkek",
    nonBinary: "Non-binary",
    preferNotToSay: "Belirtmek istemiyorum",
    startingCity: "Başlangıç şehri",
    generatedBirthDate: "Oluşturulan doğum tarihi",
    educationStatus: "Eğitim durumu",
    highSchoolStudent: "Lise Öğrencisi",
    startingStage: "Başlangıç evresi",
    biography: "Biyografi",
    shortBiography: "Kısa biyografi",
    begin: "Başla",
    beginText:
      "Life & Times on altı yaşında, lise döneminde başlar. Bu dönemdeki seçimler eğitim, arkadaşlıklar, itibar ve kariyer sistemleri büyüdükçe daha fazla önem kazanacak.",
    createCharacter: "Karakter Oluştur",
    firstNameRequired: "Ad gerekli.",
    lastNameRequired: "Soyad gerekli.",
    genderRequired: "Bir cinsiyet seçeneği seç.",
    biographyTooLong: "Biyografi {limit} karakter veya daha kısa olmalı.",
    cityRequired: "Bir başlangıç şehri seç.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;
