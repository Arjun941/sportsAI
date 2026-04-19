"use client";

import { useState } from "react";
import { CalendarDays, Clock, Trophy, BarChart3 } from "lucide-react";
import AnalyticsModal from "./AnalyticsModal";
import clsx from "clsx";

interface SessionData {
    sessionId: string;
    activityName: string;
    startedAt: string;
    durationSecs: number;
    repCount: number;
    metrics?: any;
    feedbackLog?: string[];
}

interface HistoryClientProps {
    sessions: SessionData[];
}

export default function HistoryClient({ sessions }: HistoryClientProps) {
    const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

    const openAnalytics = (session: SessionData) => {
        setSelectedSession(session);
        setIsAnalyticsOpen(true);
    };

    const closeAnalytics = () => {
        setIsAnalyticsOpen(false);
        setTimeout(() => setSelectedSession(null), 300);
    };

    return (
        <>
            {sessions.map((session: SessionData) => (
                <div
                    key={session.sessionId}
                    className="glass-panel p-6 rounded-2xl group hover:border-cyan-500/30 transition-all hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-100">{session.activityName}</h3>
                            <div className="flex gap-4 mt-2 text-sm text-slate-400 flex-wrap">
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays className="w-4 h-4" />
                                    {new Date(session.startedAt).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    {formatDuration(session.durationSecs || 0)}
                                </span>
                                {session.repCount > 0 && (
                                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                                        <Trophy className="w-4 h-4" />
                                        {session.repCount} reps
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* View Analytics Button */}
                        <button
                            onClick={() => openAnalytics(session)}
                            className="ml-4 px-4 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 hover:text-cyan-300 text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap border border-cyan-600/30 hover:border-cyan-500/50"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </button>
                    </div>

                    {/* Quick Stats */}
                    {session.metrics && (
                        <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            <QuickStat
                                label="Form Score"
                                value={`${Math.round((session.metrics.avgFormScore || 0) * 100)}%`}
                                color="cyan"
                            />
                            <QuickStat
                                label="Avg HR"
                                value={`${Math.round(session.metrics.avgHR || 0)}`}
                                color="rose"
                                suffix="bpm"
                            />
                            <QuickStat
                                label="Avg SpO2"
                                value={`${Math.round(session.metrics.avgSpO2 || 0)}`}
                                color="emerald"
                                suffix="%"
                            />
                            <QuickStat
                                label="Consistency"
                                value={`${Math.round((session.metrics.repConsistency || 0) * 100)}%`}
                                color="amber"
                            />
                        </div>
                    )}

                    {/* Feedback Log */}
                    {session.feedbackLog && session.feedbackLog.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                            <h4 className="text-xs font-bold text-cyan-500 uppercase tracking-wider mb-3">
                                Recent Coach Feedback
                            </h4>
                            <ul className="space-y-2">
                                {session.feedbackLog.slice(0, 2).map((log: string, i: number) => (
                                    <li
                                        key={i}
                                        className="text-sm text-slate-300 italic border-l-2 border-cyan-500/30 pl-3 line-clamp-2"
                                    >
                                        "{log}"
                                    </li>
                                ))}
                            </ul>
                            {session.feedbackLog.length > 2 && (
                                <p className="text-xs text-slate-500 mt-2 cursor-pointer hover:text-slate-400 transition-colors"
                                   onClick={() => openAnalytics(session)}>
                                    +{session.feedbackLog.length - 2} more feedback entries →
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Analytics Modal */}
            {selectedSession && (
                <AnalyticsModal
                    isOpen={isAnalyticsOpen}
                    onClose={closeAnalytics}
                    session={{
                        sessionId: selectedSession.sessionId,
                        activityName: selectedSession.activityName,
                        date: new Date(selectedSession.startedAt).toLocaleDateString(),
                        duration: selectedSession.durationSecs || 0,
                        reps: selectedSession.repCount,
                        metrics: selectedSession.metrics,
                        feedbackLog: selectedSession.feedbackLog,
                    }}
                />
            )}
        </>
    );
}

function QuickStat({ label, value, color, suffix }: any) {
    const colorMap = {
        cyan: "text-cyan-400",
        rose: "text-rose-400",
        emerald: "text-emerald-400",
        amber: "text-amber-400",
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</p>
            <p className={clsx("text-lg font-black mt-1", colorMap[color as keyof typeof colorMap])}>
                {value}
                {suffix && <span className="text-xs ml-0.5">{suffix}</span>}
            </p>
        </div>
    );
}

function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}
