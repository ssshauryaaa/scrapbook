"use client";

/**
 * Ripple page transition
 * -----------------------------------------------------------------------
 * A filled circle expands from wherever the user clicked (e.g. the "edit
 * profile" button) until it covers the whole screen, THEN the route
 * change happens underneath it. On the destination page, the same circle
 * is already there covering everything, and immediately shrinks back to
 * nothing — so it reads as one continuous ripple that carries you from
 * one page to the next, rather than two separate page loads.
 *
 * Usage — source page (e.g. profile-client.tsx):
 *   const { trigger, overlay } = useRippleExit();
 *   <motion.button onClick={(e) => trigger(e, "/settings", theme.primary)}>
 *     edit profile
 *   </motion.button>
 *   ...
 *   {overlay}   // render once, anywhere in the tree — it's position:fixed
 *
 * Usage — destination page (e.g. settings/page.tsx):
 *   const { overlay } = useRippleEntry(tokens.color.periwinkle);
 *   ...
 *   {overlay}
 * -----------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "scrapbook-ripple-origin";
const EXPAND_MS = 480; // how long the circle takes to fully cover the screen
const COLLAPSE_MS = 550; // how long it takes to recede on the new page

type Origin = { x: number; y: number; color: string };

function maxRippleSize(origin: { x: number; y: number }) {
    if (typeof window === "undefined") return 2000;
    // radius must reach the FARTHEST viewport corner from the click point,
    // not just some fraction of the diagonal — a click near an edge needs a
    // much bigger circle than a click dead-center
    const dx = Math.max(origin.x, window.innerWidth - origin.x);
    const dy = Math.max(origin.y, window.innerHeight - origin.y);
    const radius = Math.hypot(dx, dy);
    return radius * 2 * 1.06; // diameter, +6% so the edge is never visible
}

/** Call on the page you're navigating AWAY from. */
export function useRippleExit() {
    const router = useRouter();
    const [ripple, setRipple] = useState<(Origin & { size: number }) | null>(null);

    const trigger = useCallback(
        (e: React.MouseEvent, href: string, color: string) => {
            const origin: Origin = { x: e.clientX, y: e.clientY, color };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(origin));

            setRipple({ ...origin, size: 0 });
            // start at 0 on this frame, grow on the next — guarantees the
            // browser actually animates the transition instead of snapping
            requestAnimationFrame(() => setRipple({ ...origin, size: maxRippleSize(origin) }));

            setTimeout(() => router.push(href), EXPAND_MS);
        },
        [router]
    );

    const overlay = (
        <AnimatePresence>
            {ripple && (
                <motion.div
                    className="fixed z-[999] pointer-events-none rounded-full"
                    style={{ left: ripple.x, top: ripple.y, translateX: "-50%", translateY: "-50%", background: ripple.color }}
                    initial={{ width: 0, height: 0 }}
                    animate={{ width: ripple.size, height: ripple.size }}
                    transition={{ duration: EXPAND_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
                />
            )}
        </AnimatePresence>
    );

    return { trigger, overlay };
}

/** Call on the page you're navigating TO. Reads the stored click origin
 * (if the visitor arrived via a ripple link) and shrinks the covering
 * circle away. If there's no stored origin — e.g. the page was opened
 * directly or refreshed — nothing renders, so this is always safe to
 * include. */
export function useRippleEntry(fallbackColor: string) {
    const [origin, setOrigin] = useState<Origin | null>(null);
    const [size, setSize] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        let parsed: Origin;
        try {
            parsed = JSON.parse(raw) as Origin;
        } catch {
            sessionStorage.removeItem(STORAGE_KEY);
            return;
        }

        setOrigin(parsed);
        setSize(maxRippleSize(parsed));
        setVisible(true);

        // NOTE: sessionStorage is intentionally NOT cleared here. In dev,
        // React Strict Mode runs this effect, then its cleanup, then the
        // effect again — if we deleted the key up front, the cleanup would
        // cancel the shrink below and the second run would find nothing left
        // to schedule it with, leaving the circle stuck fully covering the
        // screen. Clearing it only once the shrink has actually finished
        // means the (final) run always has what it needs.
        const shrink = requestAnimationFrame(() => setSize(0));
        const hide = setTimeout(() => {
            setVisible(false);
            sessionStorage.removeItem(STORAGE_KEY);
        }, COLLAPSE_MS + 50);

        return () => {
            cancelAnimationFrame(shrink);
            clearTimeout(hide);
        };
    }, []);

    const overlay = (
        <AnimatePresence>
            {visible && origin && (
                <motion.div
                    className="fixed z-[999] pointer-events-none rounded-full"
                    style={{
                        left: origin.x,
                        top: origin.y,
                        translateX: "-50%",
                        translateY: "-50%",
                        background: origin.color || fallbackColor,
                    }}
                    animate={{ width: size, height: size }}
                    transition={{ duration: COLLAPSE_MS / 1000, ease: [0.65, 0, 0.35, 1] }}
                />
            )}
        </AnimatePresence>
    );

    return { overlay };
}