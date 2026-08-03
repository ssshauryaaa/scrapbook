"use client";

/**
 * Scrapbook — floating navbar
 * -----------------------------------------------------------------------
 * Brand tokens locked earlier in the project (kept identical to the
 * login/signup card so nothing feels re-skinned):
 *   paper #FAF6EC · ink #2B2A28 · periwinkle #6C5CE7
 *   scrap pink #FF6F91 · sticker amber #FFC857 · mint #4ECDC4
 *   display: Baloo 2 · body: Manrope · terminal accent: VT323 (unused here,
 *   reserved for boot-sequence-style moments only)
 *
 * Requires: framer-motion, lucide-react (both already used on the login page)
 * Fonts: same Google Fonts <style> import used on the login page — if that
 * import already lives in a layout/root file, delete the <style> block below
 * to avoid loading it twice.
 *
 * Behavior:
 *  - Floats with margin from the viewport edge, not flush like a classic navbar.
 *  - Starts on a wide paper "pill", shrinks + gains blur/shadow once the page
 *    scrolls, so it reads as a physical card lifting off the paper background.
 *  - Active link gets a periwinkle pill that slides between links via a
 *    shared layoutId (framer-motion magnetic/morph effect).
 *  - Notification bell carries a small amber "sticker" dot, matching the
 *    sticker language from the login page's floating emoji stickers.
 *  - Mobile: hamburger opens a paper dropdown panel pinned with a strip of
 *    washi tape, consistent with the scrapbook motif elsewhere in the app.
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Compass, Bell, User, Menu, X, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const tokens = {
  color: {
    paper: "#FAF6EC",
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
  },
};

const LINKS = [
  { href: "/dashboard", label: "home", icon: Home },
  { href: "/explore", label: "explore", icon: Compass },
  { href: "/notifications", label: "notifications", icon: Bell, badge: true },
  { href: "/profile", label: "profile", icon: User },
];

export default function Navbar({ noSpacer = false }: { noSpacer?: boolean } = {}) {
  const { profile } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const profileHref = profile?.username ? `/${profile.username}` : "/profile";
  const navLinks = LINKS.map((link) =>
    link.href === "/profile" ? { ...link, href: profileHref } : link
  );

  // Optimistic active-link state: updates the instant a link is clicked so
  // the pill starts sliding right away, instead of waiting for the route
  // change to finish and pathname to catch up. Re-synced from the real
  // pathname on mount and on browser back/forward.
  const [activeHref, setActiveHref] = useState(pathname);
  useEffect(() => {
    setActiveHref(pathname);
  }, [pathname]);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700&family=Manrope:wght@400;500;700&display=swap');
        .scrapbook-nav-link:focus-visible {
          outline: 2px solid ${tokens.color.periwinkle};
          outline-offset: 3px;
          border-radius: 9999px;
        }
        @keyframes badge-pop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
      `}</style>

      <motion.header
        initial={reducedMotion ? false : { y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
        className="fixed top-0 left-0 right-0 z-40 flex justify-center px-3 sm:px-4"
        style={{ paddingTop: scrolled ? 10 : 18 }}
      >
        <motion.nav
          animate={{
            maxWidth: scrolled ? 720 : 860,
            boxShadow: scrolled
              ? "0 10px 30px rgba(43,42,40,0.14)"
              : "0 4px 14px rgba(43,42,40,0.06)",
          }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full rounded-full border flex items-center justify-between gap-2 px-3 sm:px-4"
          style={{
            background: scrolled ? "rgba(250,246,236,0.82)" : tokens.color.paper,
            backdropFilter: scrolled ? "blur(14px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
            borderColor: "#E4E0D3",
            height: scrolled ? 56 : 64,
            fontFamily: tokens.font.body,
          }}
        >
          {/* logo */}
          <Link
            href="/dashboard"
            className="scrapbook-nav-link shrink-0 flex items-center gap-1.5 rounded-full px-1"
            aria-label="Scrapbook home"
          >
            <motion.span
              whileHover={reducedMotion ? undefined : { rotate: -8, scale: 1.08 }}
              className="inline-flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: tokens.color.periwinkle, color: "#fff", fontFamily: tokens.font.display, fontSize: 15, fontWeight: 700 }}
            >
              s
            </motion.span>
            <span
              className="hidden sm:inline text-lg"
              style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}
            >
              scrapbook
            </span>
          </Link>

          {/* desktop links */}
          <ul className="hidden md:flex items-center gap-1 relative">
            {navLinks.map((link) => {
              const active = activeHref === link.href;
              const Icon = link.icon;
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    onClick={() => setActiveHref(link.href)}
                    className="scrapbook-nav-link relative z-10 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm transition-colors"
                    style={{
                      color: active ? "#fff" : tokens.color.inkSoft,
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                        className="absolute inset-0 rounded-full -z-10"
                        style={{ background: tokens.color.periwinkle }}
                      />
                    )}
                    <Icon size={16} strokeWidth={2.2} />
                    <span className="capitalize">{link.label}</span>

                    {link.badge && (
                      <span
                        aria-hidden
                        className="absolute -top-0.5 -right-0.5 rounded-full border-2"
                        style={{
                          width: 9,
                          height: 9,
                          background: tokens.color.amber,
                          borderColor: tokens.color.paper,
                          animation: reducedMotion ? "none" : "badge-pop 2.2s ease-in-out infinite",
                        }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* right side: CTA + mobile toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.a
              href="/new"
              whileHover={reducedMotion ? undefined : { scale: 1.04, boxShadow: "0 8px 18px rgba(108,92,231,0.35)" }}
              whileTap={reducedMotion ? undefined : { scale: 0.95 }}
              className="scrapbook-nav-link hidden sm:inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium text-white"
              style={{ background: tokens.color.periwinkle }}
            >
              <Plus size={15} strokeWidth={2.4} />
              new scrap
            </motion.a>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="scrapbook-nav-link md:hidden inline-flex items-center justify-center rounded-full"
              style={{ width: 38, height: 38, color: tokens.color.ink }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </motion.nav>
      </motion.header>

      {/* mobile dropdown panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed left-3 right-3 top-[74px] z-30 md:hidden rounded-2xl border shadow-xl overflow-hidden"
            style={{ background: tokens.color.paper, borderColor: "#E4E0D3" }}
          >
            {/* washi tape pinning the panel, same device as the login card */}
            <div
              className="absolute -top-2 left-8 opacity-80"
              style={{ width: 52, height: 18, background: tokens.color.mint, transform: "rotate(-6deg)" }}
            />

            <ul className="flex flex-col p-2">
              {navLinks.map((link, i) => {
                const active = activeHref === link.href;
                const Icon = link.icon;
                return (
                  <motion.li
                    key={link.href}
                    initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: reducedMotion ? 0 : i * 0.05 }}
                    className="relative"
                  >
                    <Link
                      href={link.href}
                      onClick={() => setActiveHref(link.href)}
                      className="scrapbook-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm relative overflow-hidden"
                      style={{
                        color: active ? "#fff" : tokens.color.ink,
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active-pill-mobile"
                          transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
                          className="absolute inset-0 -z-10"
                          style={{ background: tokens.color.periwinkle }}
                        />
                      )}
                      <Icon size={17} strokeWidth={2.2} />
                      <span className="capitalize">{link.label}</span>
                      {link.badge && (
                        <span
                          aria-hidden
                          className="rounded-full ml-auto"
                          style={{ width: 8, height: 8, background: tokens.color.amber }}
                        />
                      )}
                    </Link>
                  </motion.li>
                );
              })}
              <motion.li
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reducedMotion ? 0 : navLinks.length * 0.05 }}
                className="pt-1 mt-1 border-t"
                style={{ borderColor: "#E4E0D3" }}
              >
                <a
                  href="/new"
                  className="scrapbook-nav-link flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium text-white mt-2"
                  style={{ background: tokens.color.periwinkle }}
                >
                  <Plus size={16} strokeWidth={2.4} />
                  new scrap
                </a>
              </motion.li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* spacer so page content doesn't sit under the floating nav */}
      {!noSpacer && <div style={{ height: scrolled ? 76 : 92 }} aria-hidden />}
    </>
  );
}