"use client";

import { motion } from "framer-motion";
import { tokens } from "@/lib/scrapbook-theme";

export type MutualVisitor = {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
};

export default function MutualVisitors({ visitors }: { visitors: MutualVisitor[] }) {
    if (!visitors?.length) return null;

    return (
        <div
            className="rounded-2xl border p-4 relative overflow-hidden"
            style={{ background: "#fff", borderColor: "#E4E0D3" }}
        >
            {/* washi tape corner, matching the login-card + navbar-panel device */}
            <div
                className="absolute -top-2 right-6 opacity-80"
                style={{ width: 44, height: 16, background: tokens.color.amber, transform: "rotate(5deg)" }}
            />

            <p
                className="text-sm mb-3"
                style={{ fontFamily: tokens.font.display, fontWeight: 700, color: tokens.color.ink }}
            >
                who stopped by
            </p>

            <div className="flex items-center">
                {visitors.slice(0, 8).map((v, i) => (
                    <motion.a
                        key={v.id}
                        href={`/${v.username}`}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        whileHover={{ y: -4, zIndex: 20 }}
                        className="relative rounded-full border-2 shrink-0"
                        style={{
                            width: 34,
                            height: 34,
                            marginLeft: i === 0 ? 0 : -10,
                            borderColor: tokens.color.paper,
                            zIndex: 10 - i,
                            background: tokens.color.periwinkle,
                        }}
                        title={v.display_name || v.username}
                    >
                        {v.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={v.avatar_url}
                                alt={v.display_name || v.username}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <span
                                className="w-full h-full flex items-center justify-center rounded-full text-white text-xs"
                                style={{ fontFamily: tokens.font.display, fontWeight: 700 }}
                            >
                                {(v.display_name || v.username).slice(0, 1).toUpperCase()}
                            </span>
                        )}
                    </motion.a>
                ))}
                {visitors.length > 8 && (
                    <span
                        className="ml-2 text-xs"
                        style={{ color: tokens.color.inkSoft, fontFamily: tokens.font.body }}
                    >
                        +{visitors.length - 8} more
                    </span>
                )}
            </div>
            <p className="text-[11px] mt-2" style={{ color: tokens.color.inkSoft }}>
                only shown because you both opted in — mutual visitors only
            </p>
        </div>
    );
}