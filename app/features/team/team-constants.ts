export const TEAM = {
  NAME_MAX_LENGTH: 64,
  NAME_MIN_LENGTH: 2,
  BIO_MAX_LENGTH: 2000,
  TWITTER_MAX_LENGTH: 50,
  MAX_MEMBER_COUNT: 8,
};

export const TEAM_MEMBER_ROLES = [
  "CAPTAIN",
  "FRONTLINE",
  "SUPPORT",
  "MIDLINE",
  "BACKLINE",
  "FLEX",
  "COACH",
] as const;
