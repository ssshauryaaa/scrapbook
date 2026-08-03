"use client";

/**
 * Manage drawers — wall & testimonial deletion
 * -----------------------------------------------------------------------
 * Two "index tab" pull-tabs sit fixed to the right edge of the edit page —
 * one pinned in the top third, one in the bottom third, so their drawers
 * can never overlap even if both are open at once. Each drawer is fully
 * independent: opening one doesn't affect the other, and NEITHER closes
 * from an outside click or Escape — only its own close (X) button does,
 * per spec.
 *
 * Permissions (this is always the profile owner's own edit page, so no
 * per-item author/owner branching is needed here):
 *   - scraps: owner may delete any scrap on their own wall
 *   - testimonials: owner may delete/unpublish any testimonial about them
 *
 * Backend note: scraps already had a "delete by author or recipient" RLS
 * policy in the original schema. Testimonials only had SELECT/UPDATE
 * policies before now — you'll need to add:
 *
 *   create policy "testimonials_delete_author_or_recipient"
 *     on public.testimonials for delete
 *     using (auth.uid() = author_id or auth.uid() = recipient_id);
 * -----------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Trash2, MessageSquareText, Quote, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tokens } from "@/lib/scrapbook-theme";

type ManagedScrap = {
    id: string;
    type: string;
    content: string | null;
    created_at: string;
    author: { username: string; display_name: string | null } | null;
};

type ManagedTestimonial = {
    id: string;
    content: string;
    status: string;
    created_at: string;
    author: { username: string; display_name: string | null } | null;
};

export default function ManageDrawers({ userId }: { userId: string }) {
    return (
        <>
            <ManageTab
                label="manage wall"
                color={tokens.color.amber}
                anchor="top"
                icon={<MessageSquareText size={15} />}
            >
                {(close) => <WallDrawerBody userId={userId} onClose={close} />}
            </ManageTab>

            <ManageTab
                label="manage testimonials"
                color={tokens.color.pink}
                anchor="bottom"
                icon={<Quote size={15} />}
            >
                {(close) => <TestimonialDrawerBody userId={userId} onClose={close} />}
            </ManageTab>
        </>
    );
}

/* -------------------------------------------------------------------- */
/* shared tab + drawer shell                                             */
/* -------------------------------------------------------------------- */

function ManageTab({
    label,
    color,
    anchor,
    icon,
    children,
}: {
    label: string;
    color: string;
    anchor: "top" | "bottom";
    icon: React.ReactNode;
    children: (close: () => void) => React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* pull-tab — clicking only ever opens; closing is the drawer's job */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed z-40 flex items-center gap-2 rounded-l-xl shadow-md transition-transform hover:-translate-x-1"
                style={{
                    right: 0,
                    [anchor === "top" ? "top" : "bottom"]: "28%",
                    background: color,
                    color: "#fff",
                    padding: "10px 8px",
                    writingMode: "vertical-rl",
                    fontFamily: tokens.font.display,
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: 0.3,
                }}
                aria-label={label}
            >
                <span style={{ transform: "rotate(180deg)" }} className="flex items-center gap-2">
                    {label}
                    {icon}
                </span>
            </button>

            {/* drawer */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ x: "105%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "105%" }}
                        transition={{ duration: 0.35, ease: [0.65, 0, 0.35, 1] }}
                        className="fixed z-50 flex flex-col rounded-l-2xl border shadow-2xl"
                        style={{
                            right: 0,
                            [anchor === "top" ? "top" : "bottom"]: "8%",
                            width: "min(92vw, 380px)",
                            maxHeight: "42vh",
                            background: "#fff",
                            borderColor: "#E4E0D3",
                        }}
                    >
                        <div
                            className="flex items-center justify-between px-4 py-3 border-b shrink-0"
                            style={{ borderColor: "#E4E0D3" }}
                        >
                            <p className="text-sm" style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}>
                                {label}
                            </p>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-full p-1 hover:opacity-70 transition-opacity"
                                style={{ color: tokens.color.inkSoft }}
                                aria-label={`Close ${label}`}
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <div className="overflow-y-auto px-4 py-3 flex-1">{children(() => setOpen(false))}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <p className="text-xs text-center py-6" style={{ color: tokens.color.inkSoft }}>
            {text}
        </p>
    );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
    const [confirming, setConfirming] = useState(false);

    if (confirming) {
        return (
            <div className="flex items-center gap-1.5 text-xs shrink-0">
                <span style={{ color: tokens.color.inkSoft }}>delete?</span>
                <button
                    type="button"
                    onClick={onConfirm}
                    className="rounded-full px-2 py-0.5 text-white font-medium"
                    style={{ background: tokens.color.pink }}
                >
                    yes
                </button>
                <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="rounded-full px-2 py-0.5"
                    style={{ color: tokens.color.inkSoft, border: "1px solid #E4E0D3" }}
                >
                    cancel
                </button>
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={() => setConfirming(true)}
            className="shrink-0 rounded-full p-1.5 hover:bg-red-50 transition-colors"
            style={{ color: tokens.color.inkSoft }}
            aria-label="Delete"
        >
            <Trash2 size={14} />
        </button>
    );
}

/* -------------------------------------------------------------------- */
/* wall drawer                                                           */
/* -------------------------------------------------------------------- */

function WallDrawerBody({ userId, onClose }: { userId: string; onClose: () => void }) {
    const [scraps, setScraps] = useState<ManagedScrap[] | null>(null);
    const [deletedId, setDeletedId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();
        supabase
            .from("scraps")
            .select("id, type, content, created_at, author:profiles!scraps_author_id_fkey(username, display_name)")
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false })
            .then(({ data }) => {
                if (!cancelled) setScraps((data as any) ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    async function handleDelete(id: string) {
        const supabase = createClient();
        setDeletedId(id);
        const { error } = await supabase.from("scraps").delete().eq("id", id);
        if (!error) {
            setScraps((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
        }
        setDeletedId(null);
    }

    if (scraps === null) return <EmptyState text="loading your wall…" />;
    if (scraps.length === 0) return <EmptyState text="nothing on your wall yet" />;

    return (
        <div className="space-y-2">
            {scraps.map((s) => (
                <div
                    key={s.id}
                    className="flex items-start gap-2 rounded-lg border p-2.5"
                    style={{ borderColor: "#E4E0D3", opacity: deletedId === s.id ? 0.5 : 1 }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-xs truncate" style={{ color: tokens.color.ink }}>
                            {s.content || `[${s.type}]`}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: tokens.color.inkSoft }}>
                            {s.author?.display_name || `@${s.author?.username}`} · {new Date(s.created_at).toLocaleDateString()}
                        </p>
                    </div>
                    <DeleteButton onConfirm={() => handleDelete(s.id)} />
                </div>
            ))}
        </div>
    );
}

/* -------------------------------------------------------------------- */
/* testimonials drawer                                                   */
/* -------------------------------------------------------------------- */

function TestimonialDrawerBody({ userId, onClose }: { userId: string; onClose: () => void }) {
    const [items, setItems] = useState<ManagedTestimonial[] | null>(null);
    const [deletedId, setDeletedId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const supabase = createClient();
        supabase
            .from("testimonials")
            .select("id, content, status, created_at, author:profiles!testimonials_author_id_fkey(username, display_name)")
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false })
            .then(({ data }) => {
                if (!cancelled) setItems((data as any) ?? []);
            });
        return () => {
            cancelled = true;
        };
    }, [userId]);

    async function handleDelete(id: string) {
        const supabase = createClient();
        setDeletedId(id);
        const { error } = await supabase.from("testimonials").delete().eq("id", id);
        if (!error) {
            setItems((prev) => (prev ? prev.filter((t) => t.id !== id) : prev));
        }
        setDeletedId(null);
    }

    if (items === null) return <EmptyState text="loading your testimonials…" />;
    if (items.length === 0) return <EmptyState text="no testimonials yet" />;

    return (
        <div className="space-y-2">
            {items.map((t) => (
                <div
                    key={t.id}
                    className="flex items-start gap-2 rounded-lg border p-2.5"
                    style={{ borderColor: "#E4E0D3", opacity: deletedId === t.id ? 0.5 : 1 }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="text-xs line-clamp-2" style={{ color: tokens.color.ink }}>
                            {t.content}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px]" style={{ color: tokens.color.inkSoft }}>
                                {t.author?.display_name || `@${t.author?.username}`} · {new Date(t.created_at).toLocaleDateString()}
                            </p>
                            {t.status === "approved" && (
                                <span className="inline-flex items-center gap-0.5 text-[10px]" style={{ color: tokens.color.mint }}>
                                    <Check size={10} /> live
                                </span>
                            )}
                            {t.status === "pending" && (
                                <span className="text-[10px]" style={{ color: tokens.color.amber }}>
                                    pending
                                </span>
                            )}
                        </div>
                    </div>
                    <DeleteButton onConfirm={() => handleDelete(t.id)} />
                </div>
            ))}
        </div>
    );
}