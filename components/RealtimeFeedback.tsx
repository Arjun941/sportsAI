"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Heart, Wind, Info, CheckCircle } from "lucide-react";
import clsx from "clsx";

interface FitnessNotification {
    id: string;
    feedback: string;
    severity: "info" | "warning" | "critical";
    timestamp: number;
}

interface RealtimeFeedbackProps {
    notifications: FitnessNotification[];
}

export default function RealtimeFeedback({ notifications }: RealtimeFeedbackProps) {
    if (notifications.length === 0) return null;

    const notification = notifications[notifications.length - 1];
    
    const severityClasses = {
        info: "bg-blue-500/20 border-blue-500/30 text-blue-200",
        warning: "bg-amber-500/20 border-amber-500/30 text-amber-200",
        critical: "bg-rose-500/20 border-rose-500/30 text-rose-200",
    };

    const severityIcons = {
        info: <Info className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        critical: <AlertTriangle className="w-5 h-5 animate-pulse" />,
    };

    const severityBg = {
        info: "from-blue-600/30 to-blue-500/20",
        warning: "from-amber-600/30 to-amber-500/20",
        critical: "from-rose-600/30 to-rose-500/20",
    };

    return (
        <div className="fixed top-20 left-6 right-6 z-40 pointer-events-none">
            <div
                className={clsx(
                    "bg-gradient-to-r max-w-md glass-panel rounded-xl border animate-in fade-in slide-in-from-top-4 duration-300",
                    severityBg[notification.severity],
                    severityClasses[notification.severity]
                )}
            >
                <div className="p-4 flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                        {severityIcons[notification.severity]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight">
                            {notification.feedback}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
