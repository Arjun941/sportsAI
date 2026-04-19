"use client";
import dynamic from "next/dynamic";
import { Activity } from "@/lib/activities";

const SessionView = dynamic(() => import("./SessionView"), { 
    ssr: false,
    loading: () => (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/10 border-t-cyan-400 rounded-full animate-spin mb-4" />
            <p className="text-slate-400">Loading AI Engine...</p>
        </div>
    )
});

export default function ClientSessionWrapper({ activity }: { activity: Activity }) {
    return <SessionView activity={activity} />;
}
