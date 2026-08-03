"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Image as ImageIcon, Mic, Video, Send, Sticker } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { tokens } from "@/lib/scrapbook-theme";

export type Scrap = {
    id: string;
    type: "text" | "image" | "voice" | "video" | "gif";
    content: string | null;
    media_url: string | null;
    transcript: string | null;
    created_at: string;
    author: {
        id?: string;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
    } | null;
};

// slight alternating rotation so the wall reads as pinned-up paper scraps,
// not a rigid grid — same "physical paper" language as the login card
const ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1, -2.5, 0.5];

export default function ScrapWall({
    initialScraps,
    recipientId,
    currentUserId,
}: {
    initialScraps: Scrap[];
    recipientId: string;
    currentUserId?: string | null;
}) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);
    const [scraps, setScraps] = useState(initialScraps);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);

    useEffect(() => {
        setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel("public:scraps")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "scraps", filter: `recipient_id=eq.${recipientId}` },
                async (payload) => {
                    const row = payload.new as any;
                    // fetch the author details for the new scrap before showing it
                    const { data: author } = await supabase
                        .from("profiles")
                        .select("id, username, display_name, avatar_url")
                        .eq("id", row.author_id)
                        .single();

                    setScraps((prev) => {
                        if (prev.some((s) => s.id === row.id)) return prev;
                        return [
                        {
                            id: row.id,
                            type: row.type,
                            content: row.content,
                            media_url: row.media_url,
                            transcript: row.transcript,
                            created_at: row.created_at,
                            author,
                        },
                        ...prev,
                    ];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [recipientId, supabase]);

    async function handleSend(e: React.FormEvent) {
        e.preventDefault();
        if (!draft.trim() || sending) return;
        setSending(true);
        const { data, error } = await (supabase as any).from("scraps").insert({
            author_id: currentUserId,
            recipient_id: recipientId,
            type: "text",
            content: draft.trim(),
        }).select(`*, author:profiles!scraps_author_id_fkey(id, username, display_name, avatar_url)`).single();
        
        setSending(false);
        if (!error && data) {
            setDraft("");
            setScraps((prev) => {
                if (prev.some((s) => s.id === data.id)) return prev;
                return [data as any, ...prev];
            });
            router.refresh(); // Tells Next.js to fetch the latest server data in the background
        }
    }

    return (
        <div>
            <p
                className="text-sm mb-3 px-1"
                style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}
            >
                the wall · {scraps.length} scrap{scraps.length === 1 ? "" : "s"}
            </p>

            {currentUserId && (
                <form
                    onSubmit={handleSend}
                    className="flex items-center gap-2 rounded-2xl border p-2 mb-5"
                    style={{ background: "#fff", borderColor: "#E4E0D3" }}
                >
                    <Sticker size={18} style={{ color: tokens.color.periwinkle }} className="ml-1 shrink-0" />
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="leave a scrap on this wall..."
                        className="flex-1 min-w-0 text-sm !outline-none bg-transparent"
                        style={{ color: tokens.color.ink, fontFamily: tokens.font.body }}
                        maxLength={280}
                    />
                    <motion.button
                        type="submit"
                        disabled={!draft.trim() || sending}
                        whileHover={draft.trim() ? { scale: 1.06 } : undefined}
                        whileTap={draft.trim() ? { scale: 0.92 } : undefined}
                        className="rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 text-white"
                        style={{ width: 34, height: 34, background: tokens.color.periwinkle }}
                        aria-label="Post scrap"
                    >
                        <Send size={14} />
                    </motion.button>
                </form>
            )}

            {scraps.length === 0 ? (
                <div
                    className="rounded-2xl border border-dashed p-10 text-center"
                    style={{ borderColor: "#E4E0D3" }}
                >
                    <p style={{ color: tokens.color.inkSoft, fontSize: 14 }}>
                        this wall is empty — be the first to leave a scrap
                    </p>
                </div>
            ) : (
                <div className="columns-2 sm:columns-3 gap-3 [column-fill:_balance]">
                    <AnimatePresence initial={false}>
                        {scraps.map((scrap, i) => (
                            <ScrapCard
                                key={scrap.id}
                                scrap={scrap}
                                rotate={ROTATIONS[i % ROTATIONS.length]}
                                reducedMotion={reducedMotion}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

function ScrapCard({
    scrap,
    rotate,
    reducedMotion,
}: {
    scrap: Scrap;
    rotate: number;
    reducedMotion: boolean;
}) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -14, scale: 0.94, rotate: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotate }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={reducedMotion ? undefined : { rotate: 0, scale: 1.03, zIndex: 5 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="mb-3 break-inside-avoid rounded-2xl border p-3 relative"
            style={{ background: "#fff", borderColor: "#E4E0D3", boxShadow: "0 6px 16px rgba(43,42,40,0.06)" }}
        >
            <TypeBadge type={scrap.type} />

            {scrap.type === "image" && scrap.media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scrap.media_url} alt="" className="w-full rounded-lg mb-2 object-cover" />
            )}
            {scrap.type === "gif" && scrap.media_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scrap.media_url} alt="" className="w-full rounded-lg mb-2 object-cover" />
            )}
            {(scrap.type === "voice" || scrap.type === "video") && scrap.media_url && (
                <div
                    className="w-full rounded-lg mb-2 flex items-center justify-center"
                    style={{ background: tokens.color.paperDark, height: scrap.type === "video" ? 140 : 48 }}
                >
                    {scrap.type === "voice" ? (
                        <Mic size={18} style={{ color: tokens.color.periwinkle }} />
                    ) : (
                        <Video size={22} style={{ color: tokens.color.periwinkle }} />
                    )}
                </div>
            )}

            {scrap.content && (
                <p className="text-sm" style={{ color: tokens.color.ink, fontFamily: tokens.font.body, lineHeight: 1.5 }}>
                    {scrap.content}
                </p>
            )}
            {!scrap.content && scrap.transcript && (
                <p className="text-xs italic" style={{ color: tokens.color.inkSoft }}>
                    &ldquo;{scrap.transcript}&rdquo;
                </p>
            )}

            <div className="flex items-center gap-1.5 mt-2.5">
                <div
                    className="rounded-full flex items-center justify-center text-white shrink-0"
                    style={{ width: 18, height: 18, background: tokens.color.mint, fontSize: 9, fontFamily: tokens.font.display, fontWeight: 700 }}
                >
                    {(scrap.author?.display_name || scrap.author?.username || "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="text-[11px] truncate" style={{ color: tokens.color.inkSoft }}>
                    {scrap.author?.display_name || `@${scrap.author?.username || "someone"}`}
                </span>
            </div>
        </motion.div>
    );
}

function TypeBadge({ type }: { type: Scrap["type"] }) {
    if (type === "text") return null;
    const Icon = type === "image" || type === "gif" ? ImageIcon : type === "voice" ? Mic : Video;
    return (
        <div
            className="absolute -top-2 -right-2 rounded-full flex items-center justify-center border-2"
            style={{ width: 24, height: 24, background: tokens.color.amber, borderColor: "#fff" }}
        >
            <Icon size={12} color="#fff" strokeWidth={2.4} />
        </div>
    );
}