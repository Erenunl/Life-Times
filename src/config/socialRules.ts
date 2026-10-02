import type { SocialInteractionAction } from "../types/game";

export const RP_INTERACTION_COOLDOWN_MS = 10 * 60 * 1000;
export const FRIEND_REQUEST_MIN_FAMILIARITY = 15;
export const CLOSE_FRIEND_MIN_FRIENDSHIP = 55;
export const CLOSE_FRIEND_MIN_INTERACTIONS = 8;
export const DATING_REQUEST_MIN_FAMILIARITY = 25;
export const TEEN_ROMANCE_MAX_AGE_DIFFERENCE = 2;
export const SOCIAL_DECAY_AFTER_DAYS = 30;
export const SOCIAL_DECAY_AMOUNT = 1;

export type RelationshipEffect = {
  familiarity: number;
  friendship: number;
  romanticInterest: number;
};

export const socialInteractionLabels: Record<SocialInteractionAction, string> = {
  wave: "Wave",
  smile: "Smile",
  wink: "Wink",
  hug: "Hug",
  hold_hands: "Hold Hands",
  give_flowers: "Give Flowers",
  ask_date: "Ask on a Date",
  blow_kiss: "Blow a Kiss",
  compliment: "Compliment",
  joke: "Joke",
  flirt: "Flirt",
};

export const socialInteractionEffects: Record<SocialInteractionAction, RelationshipEffect> = {
  wave: { familiarity: 2, friendship: 0, romanticInterest: 0 },
  smile: { familiarity: 2, friendship: 1, romanticInterest: 0 },
  wink: { familiarity: 1, friendship: 0, romanticInterest: 2 },
  hug: { familiarity: 1, friendship: 2, romanticInterest: 1 },
  hold_hands: { familiarity: 1, friendship: 1, romanticInterest: 2 },
  give_flowers: { familiarity: 1, friendship: 2, romanticInterest: 2 },
  ask_date: { familiarity: 1, friendship: 0, romanticInterest: 2 },
  blow_kiss: { familiarity: 1, friendship: 0, romanticInterest: 4 },
  compliment: { familiarity: 1, friendship: 2, romanticInterest: 1 },
  joke: { familiarity: 1, friendship: 2, romanticInterest: 0 },
  flirt: { familiarity: 1, friendship: 0, romanticInterest: 3 },
};
