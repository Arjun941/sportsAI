"use client";

import { useState, useEffect } from "react";
import { X, TrendingUp, Heart, Wind, Trophy, Zap, Sparkles } from "lucide-react";
import clsx from "clsx";

interface SessionAnalytics {
    sessionId: string;
    activityName: string;
    date: string;
    duration: number;
    reps: number;
    metrics?: {
        avgFormScore?: number;
        maxFormScore?: number;
        minFormScore?: number;
        avgHR?: number;
        maxHR?: number;
        minHR?: number;
        avgSpO2?: number;
        minSpO2?: number;
        maxSpO2?: number;
        avgCadence?: number;
        totalFeedback?: number;
        feedbackThemes?: { theme: string; count: number }[];
        repConsistency?: number;
    };
    feedbackLog?: string[];
}

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: SessionAnalytics;
}

export default function AnalyticsModal({ isOpen, onClose, session }: AnalyticsModalProps) {
    const [aiInsights, setAiInsights] = useState<string>("");
    const [loadingInsights, setLoadingInsights] = useState(true);

    useEffect(() => {
        if (!isOpen) return;

        const fetchInsights = async () => {
            try {
                const response = await fetch(`/api/analytics-insights?sessionId=${encodeURIComponent(session.sessionId)}`);

                const data = await response.json();
                setAiInsights(data.insightsText || "");
            } catch (e) {
                console.error("Failed to fetch insights:", e);
                setAiInsights("");
            } finally {
                setLoadingInsights(false);
            }
        };

        setLoadingInsights(true);
        fetchInsights();
    }, [isOpen, session]);

    if (!isOpen) return null;

    const metrics = session.metrics || {};
    const formScore = Math.round(((metrics.avgFormScore ?? 0) * 100));
    const formTrend = (metrics.maxFormScore ?? 0) - (metrics.minFormScore ?? 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-linear-to-r from-slate-900 to-slate-800 border-b border-white/10 px-8 py-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100">{session.activityName}</h2>
                        <p className="text-sm text-slate-400 mt-1">{session.date}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={Trophy} label="Reps" value={session.reps} subtext="" color="amber" />
                        <StatCard icon={Zap} label="Form Score" value={`${formScore}%`} subtext={`Range: ${Math.round(((metrics.minFormScore ?? 0) * 100))}%-${Math.round(((metrics.maxFormScore ?? 0) * 100))}%`} color="cyan" />
                        <StatCard
                            icon={Heart}
                            label="Avg HR"
                            value={`${Math.round(metrics.avgHR ?? 0)}`}
                            subtext={`${Math.round(metrics.minHR ?? 0)}-${Math.round(metrics.maxHR ?? 0)} bpm`}
                            color="rose"
                        />
                        <StatCard icon={Wind} label="Avg SpO2" value={`${Math.round(metrics.avgSpO2 ?? 0)}%`} subtext={`Min: ${Math.round(metrics.minSpO2 ?? 0)}%`} color="emerald" />
                    </div>

                    {/* Session Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <InfoBox label="Duration" value={formatDuration(session.duration)} />
                        <InfoBox label="Rep Consistency" value={`${Math.round(((metrics.repConsistency ?? 0) * 100))}%`} />
                        <InfoBox label="Total Feedback Cues" value={metrics.totalFeedback ?? 0} />
                        <InfoBox label="Avg Cadence" value={`${Math.round(metrics.avgCadence ?? 0)} rpm`} />
                    </div>

                    {/* AI-Driven Coaching Insights */}
                    <div className="bg-linear-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-purple-400 shrink mt-0.5 animate-pulse" />
                            <div className="flex-1">
                                <h4 className="font-bold text-purple-400 mb-3">AI Coaching Insights</h4>
                                {loadingInsights ? (
                                    <p className="text-sm text-slate-400 italic">Analyzing your performance...</p>
                                ) : aiInsights.trim().length > 0 ? (
                                    <p className="text-sm text-slate-200 whitespace-pre-wrap leading-6">{aiInsights}</p>
                                ) : (
                                    <p className="text-sm text-slate-400">No insights generated</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Feedback Themes */}
                    {metrics.feedbackThemes && Array.isArray(metrics.feedbackThemes) && metrics.feedbackThemes.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-100 mb-4">Most Common Feedback Themes</h3>
                            <div className="space-y-2">
                                {metrics.feedbackThemes.map((theme: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="flex-1 bg-white/5 rounded-lg p-3 border border-white/10">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-slate-200">{theme.theme}</span>
                                                <span className="text-sm text-cyan-400 font-bold">{theme.count}x</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded h-2">
                                                <div
                                                    className="bg-linear-to-r from-cyan-500 to-cyan-400 h-2 rounded transition-all"
                                                    style={{
                                                        width: `${Math.min(100, (theme.count / (metrics.totalFeedback || 1)) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recent Feedback */}
                    {session.feedbackLog && session.feedbackLog.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-slate-100 mb-4">Recent Coaching Feedback</h3>
                            <div className="space-y-3 max-h-48 overflow-y-auto">
                                {session.feedbackLog.slice(0, 5).map((feedback, i) => (
                                    <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3">
                                        <p className="text-sm text-slate-300 italic">"{feedback}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Insights */}
                    <div className="bg-linear-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <TrendingUp className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-cyan-400 mb-1">Performance Insights</h4>
                                <ul className="text-sm text-slate-200 space-y-1">
                                    {formScore > 85 && <li>✓ Excellent form consistency throughout the session</li>}
                                    {formScore < 70 && <li>→ Focus on form quality; consider slowing down</li>}
                                    {formTrend > 20 && <li>→ Form degraded over time; take breaks to recover</li>}
                                    {(metrics.avgHR ?? 0) > 160 && <li>→ High intensity session; great cardiovascular work</li>}
                                    {(metrics.avgSpO2 ?? 0) < 92 && <li>→ Low oxygen levels; increase rest between reps</li>}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, subtext, color }: any) {
    const colorMap = {
        amber: "from-amber-600 to-amber-500",
        cyan: "from-cyan-600 to-cyan-500",
        rose: "from-rose-600 to-rose-500",
        emerald: "from-emerald-600 to-emerald-500",
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
            <div className={`inline-flex p-2 rounded-lg bg-linear-to-r ${colorMap[color as keyof typeof colorMap]}`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs uppercase tracking-wider text-slate-400 mt-2 font-semibold">{label}</p>
            <p className="text-2xl font-black text-slate-100 mt-1">{value}</p>
            {subtext && <p className="text-[10px] text-slate-500 mt-1">{subtext}</p>}
        </div>
    );
}

function InfoBox({ label, value }: any) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{label}</p>
            <p className="text-xl font-bold text-slate-100 mt-1">{value}</p>
        </div>
    );
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}
