/**
 * Scrapbook — shared tokens for the /create flow
 * -----------------------------------------------------------------------
 * Mirrors the brand tokens locked on the login page. Import this instead
 * of redefining hexes so the whole app stays in sync if a token changes.
 * -----------------------------------------------------------------------
 */

export const tokens = {
  color: {
    paper: "#F7F2E3",
    paperDark: "#F0EADA",
    paperCard: "#FFFFFF",
    ink: "#2B2A28",
    inkSoft: "#6B6860",
    periwinkle: "#6C5CE7",
    periwinkleDark: "#4A3FC7",
    pink: "#FF6F91",
    amber: "#FFC857",
    mint: "#4ECDC4",
    filmBlack: "#0D0D0D",
  },
  font: {
    display: "'Baloo 2', sans-serif",
    body: "'Manrope', sans-serif",
    terminal: "'VT323', monospace",
  },
} as const;

export type ScrapType = "text" | "image" | "voice" | "video" | "gif";

export const SCRAP_TYPES: {
  id: ScrapType;
  label: string;
  hint: string;
  accent: string;
}[] = [
  { id: "text", label: "text", hint: "lined index card", accent: tokens.color.periwinkle },
  { id: "image", label: "image", hint: "polaroid frame", accent: tokens.color.pink },
  { id: "voice", label: "voice", hint: "cassette tape", accent: tokens.color.amber },
  { id: "video", label: "video", hint: "filmstrip", accent: tokens.color.filmBlack },
  { id: "gif", label: "gif", hint: "sticker sheet", accent: tokens.color.mint },
];

export const MOOD_TAGS = [
  { id: "funny", label: "funny", color: tokens.color.amber },
  { id: "wholesome", label: "wholesome", color: tokens.color.mint },
  { id: "unhinged", label: "unhinged", color: tokens.color.pink },
  { id: "iconic", label: "iconic", color: tokens.color.periwinkle },
] as const;

export const STICKER_LIBRARY = [
  { id: "star", emoji: "★", color: tokens.color.amber },
  { id: "heart", emoji: "♡", color: tokens.color.pink },
  { id: "sparkle", emoji: "✦", color: tokens.color.mint },
  { id: "smile", emoji: "☺", color: tokens.color.periwinkle },
  { id: "note", emoji: "♪", color: tokens.color.pink },
  { id: "flower", emoji: "✿", color: tokens.color.mint },
  { id: "starOutline", emoji: "☆", color: tokens.color.amber },
];

export const TAPE_LIBRARY = [
  { id: "tape-amber", color: tokens.color.amber },
  { id: "tape-mint", color: tokens.color.mint },
  { id: "tape-pink", color: tokens.color.pink },
  { id: "tape-periwinkle", color: tokens.color.periwinkle },
];

export const BURST_COLORS = [
  tokens.color.amber,
  tokens.color.pink,
  tokens.color.mint,
  tokens.color.periwinkle,
];

export const TEXT_PLACEHOLDERS = [
  "remember when we…",
  "ok but you HAVE to hear about…",
  "random thought at 2am:",
  "i saw this and thought of you —",
  "confession:",
];

export type PlacedDeco = {
  id: string;
  kind: "sticker" | "tape";
  refId: string;
  x: number; // px, relative to canvas
  y: number;
  rotate: number;
};

export type Draft = {
  id: string;
  type: ScrapType;
  savedAt: number;
  preview: string;
  payload: unknown;
};

/* ---------------------------------------------------------------------- */
/* /create HUB — the four things this page can make                       */
/* -----------------------------------------------------------------------
 * Each kind keeps its own "material": a scrap is paper, a testimonial is
 * a signed & sealed note, a community is a felt pennant you pin up, a
 * community post is a notecard tacked to someone else's board. Same
 * tilt-card + morph-into-canvas mechanic as ScrapType, one level up.
 * -----------------------------------------------------------------------
 */

export type CreateKind = "scrap" | "testimonial" | "community" | "community-post";

export const CREATE_KINDS: {
  id: CreateKind;
  label: string;
  hint: string;
  accent: string;
}[] = [
  { id: "scrap", label: "a scrap", hint: "for a friend's wall", accent: tokens.color.periwinkle },
  { id: "testimonial", label: "a testimonial", hint: "signed & sealed", accent: tokens.color.amber },
  { id: "community", label: "a community", hint: "start a board", accent: tokens.color.mint },
  { id: "community-post", label: "a community post", hint: "pin to a board", accent: tokens.color.pink },
];

export const TESTIMONIAL_OPENERS = [
  "the first time we met…",
  "what i'd tell anyone about you:",
  "for the record —",
  "you probably don't know this, but",
  "if i had to describe you in a paragraph:",
];

export const TESTIMONIAL_TRAITS = [
  { id: "loyal", label: "loyal", color: tokens.color.periwinkle },
  { id: "hilarious", label: "hilarious", color: tokens.color.amber },
  { id: "chaotic-good", label: "chaotic good", color: tokens.color.pink },
  { id: "ride-or-die", label: "ride or die", color: tokens.color.mint },
];

export type CommunityDraft = {
  name: string;
  handle: string;
  description: string;
  banner: File | null;
};

export const COMMUNITY_VIBES = [
  { id: "public", label: "open to all", color: tokens.color.mint },
  { id: "invite", label: "invite only", color: tokens.color.periwinkle },
];
