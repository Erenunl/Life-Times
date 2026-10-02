export type GameDate = {
  year: number;
  month: number;
  day: number;
};

export type FormattedGameDate = GameDate & {
  formatted: string;
};

export type City = {
  id: string;
  name: string;
  country: string;
};

export type Gender = "female" | "male" | "non-binary" | "unspecified";

export type ProfileImage = {
  dataUrl: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  width: number;
  height: number;
};

export type EducationStatus = {
  level: "high-school" | "university";
  status: "student" | "graduated" | "paused";
  institutionName?: string;
  track?: string;
  progressPercent: number;
};

export type CareerStatus = {
  status: "none" | "employed";
  title: string;
  employer?: string;
  weeklyIncome: number;
  reputation: number;
};

export type Character = {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  birthDate: GameDate;
  biography: string;
  profileImage?: ProfileImage;
  cityId: string;
  money: number;
  lifeStage: "high-school";
  education: EducationStatus;
  career: CareerStatus;
  mood: number;
  energy: number;
  createdAt: string;
  lastActiveAt: string;
  isDeceased: boolean;
  diedAt?: string;
  ageAtDeath?: number;
  deathReason?: "inactivity";
};

export type DashboardEvent = {
  id: string;
  title: string;
  detail: string;
};

export type QuickAction = {
  id: string;
  label: string;
};

export type AcademicDirection = "quantitative" | "verbal" | "balanced";

export type SubjectCategory = "quantitative" | "verbal" | "general";

export type SubjectDefinition = {
  id: string;
  name: string;
  category: SubjectCategory;
};

export type HighSchoolDefinition = {
  id: string;
  name: string;
  cityId: string;
  type: "high-school";
};

export type SubjectPerformance = {
  subjectId: string;
  score: number;
};

export type EducationEvent = {
  id: string;
  message: string;
  createdAt: string;
};

export type ClassDecision = {
  id: string;
  subjectId: string;
  decision: "attended" | "skipped";
  decidedAt: string;
  realDateKey: string;
  realWeekKey: string;
};

export type ExamSubjectSnapshot = {
  subjectId: string;
  score: number;
};

export type ExamResult = {
  id: string;
  periodKey: string;
  periodStartAt: string;
  periodEndAt: string;
  processedAt: string;
  score: number;
  grade: string;
  quantitativeScore: number;
  verbalScore: number;
  academicAverage: number;
  classesAttended: number;
  classesSkipped: number;
  strongestSubjectId?: string;
  weakestSubjectId?: string;
  subjectSnapshots: ExamSubjectSnapshot[];
  acknowledged: boolean;
};

export type EducationProgress = {
  characterId: string;
  schoolId: string;
  educationStartedAt: string;
  academicDirection?: AcademicDirection;
  curriculumSubjectIds: string[];
  subjectPerformances: Record<string, SubjectPerformance>;
  rotationIndex: number;
  currentOfferedSubjectId?: string;
  lastClassDecisionAt?: string;
  currentWeekKey: string;
  weeklyAttended: number;
  weeklySkipped: number;
  totalAttended: number;
  totalSkipped: number;
  examCycleStartedAt: string;
  processedExamPeriodKeys: string[];
  examHistory: ExamResult[];
  decisions: ClassDecision[];
  events: EducationEvent[];
  updatedAt: string;
};

export type MessageMode = "ic" | "ooc";

export type PublicCharacterProfile = {
  id: string;
  ownerUserId: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  cityId: string;
  lifeStage: "high-school";
  educationStatus: string;
  biography: string;
  birthDate: GameDate;
  isDeceased: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummary = {
  id: string;
  otherCharacter: PublicCharacterProfile;
  lastMessageBody?: string;
  lastMessageAt?: string;
  unreadCount: number;
};

export type DirectMessage = {
  id: string;
  conversationId: string;
  senderCharacterId: string;
  mode: MessageMode;
  body: string;
  readAt?: string;
  createdAt: string;
};

export type RelationshipState = {
  sourceCharacterId: string;
  targetCharacterId: string;
  familiarity: number;
  friendship: number;
  romanticInterest: number;
  updatedAt: string;
};

export type SocialInteractionAction =
  | "wave"
  | "smile"
  | "wink"
  | "hug"
  | "hold_hands"
  | "give_flowers"
  | "ask_date"
  | "blow_kiss"
  | "compliment"
  | "joke"
  | "flirt";

export type SocialInteraction = {
  id: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  action: SocialInteractionAction;
  eventText: string;
  createdAt: string;
};

export type ForumThread = {
  id: string;
  authorCharacterId: string;
  title: string;
  mode: MessageMode;
  category: string;
  createdAt: string;
  updatedAt: string;
  author?: PublicCharacterProfile;
};

export type ForumPost = {
  id: string;
  threadId: string;
  authorCharacterId: string;
  body: string;
  createdAt: string;
  author?: PublicCharacterProfile;
};

export type MutualRelationshipStatus =
  | "acquaintance"
  | "friend"
  | "close_friend"
  | "dating"
  | "ended";

export type SocialRequestType = "friend" | "close_friend" | "dating";

export type SocialRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "expired";

export type MutualRelationship = {
  id: string;
  characterOneId: string;
  characterTwoId: string;
  status: MutualRelationshipStatus;
  startedAt: string;
  endedAt?: string;
  endedReason?: "manual" | "death";
  createdAt: string;
  updatedAt: string;
  otherCharacter?: PublicCharacterProfile;
};

export type SocialRequest = {
  id: string;
  sourceCharacterId: string;
  targetCharacterId: string;
  type: SocialRequestType;
  status: SocialRequestStatus;
  createdAt: string;
  respondedAt?: string;
  sourceCharacter?: PublicCharacterProfile;
  targetCharacter?: PublicCharacterProfile;
};

export type RelationshipHistoryEvent = {
  id: string;
  characterOneId: string;
  characterTwoId: string;
  eventType: string;
  summary: string;
  createdAt: string;
};

export type SocialNotification = {
  id: string;
  characterId: string;
  kind: string;
  body: string;
  linkPath?: string;
  readAt?: string;
  createdAt: string;
};

export type SocialPrivacyValue = "everyone" | "friends" | "nobody";

export type RomanticPrivacyValue = "eligible" | "friends" | "nobody";

export type SocialPrivacySettings = {
  characterId: string;
  dmPolicy: SocialPrivacyValue;
  interactionPolicy: SocialPrivacyValue;
  romanticRequestPolicy: RomanticPrivacyValue;
  updatedAt: string;
};

export type ContentReportReason =
  | "harassment"
  | "spam"
  | "inappropriate_content"
  | "impersonation"
  | "other";

export type ReportTargetType = "character" | "direct_message" | "forum_post";
