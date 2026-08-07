/**
 * Scrapbook — shared brand tokens
 * -----------------------------------------------------------------------
 * Single source of truth for the tokens used across the login page, the
 * navbar, and the profile page:
 *   paper #FAF6EC · ink #2B2A28 · periwinkle #6C5CE7
 *   scrap pink #FF6F91 · sticker amber #FFC857 · mint #4ECDC4
 *   display: Baloo 2 · body: Manrope · terminal accent: VT323
 *
 * Import this instead of re-declaring the tokens object in every file.
 * -----------------------------------------------------------------------
 */

export const tokens = {
    color: {
        paper: "#F7F2E3",
        paperDark: "#F0EADA",
        ink: "#2B2A28",
        inkSoft: "#6B6860",
        periwinkle: "#6C5CE7",
        periwinkleDark: "#4A3FC7",
        pink: "#FF6F91",
        amber: "#FFC857",
        mint: "#4ECDC4",
    },
    font: {
        display: "'Baloo 2', sans-serif",
        body: "'Manrope', sans-serif",
        terminal: "'VT323', monospace",
    },
} as const;

/** Drop this <style> once near the root layout instead of in every page. */
export const SCRAPBOOK_FONT_IMPORT =
    "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700&family=Manrope:wght@400;500;700&family=VT323&display=swap";

/** A per-profile custom theme (from the `themes` table) layered on top of the base tokens. */
export type ProfileTheme = {
    id: string;
    name: string;
    palette?: { background?: string; primary?: string; accent?: string } | null;
    banner_url?: string | null;
};

/** Resolves a profile's saved theme against the base palette, falling back gracefully. */
export function resolveTheme(theme?: ProfileTheme | null) {
    return {
        background: theme?.palette?.background || tokens.color.paper,
        primary: theme?.palette?.primary || tokens.color.periwinkle,
        accent: theme?.palette?.accent || tokens.color.pink,
        bannerUrl: theme?.banner_url || null,
    };
}