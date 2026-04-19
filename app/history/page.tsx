import Link from "next/link";
import { ChevronLeft, CalendarDays, Clock, Trophy } from "lucide-react";
import connectToDatabase from "@/lib/mongodb";
import Session from "@/lib/models/Session";
import HistoryClient from "@/components/HistoryClient";
import ProfileButton from "@/components/ProfileButton";

// Ensure this page is rendered dynamically
export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    await connectToDatabase();
    
    // Fetch sessions
    const sessions = await Session.find().sort({ startedAt: -1 }).limit(30).lean();
    const sessionsJSON = JSON.parse(JSON.stringify(sessions));

    return (
        <div className="min-h-screen bg-black pb-safe">
            <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Session History</h1>
                </div>
                <ProfileButton />
            </header>

            <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
                {sessionsJSON.length === 0 ? (
                    <div className="text-center py-20">
                        <Trophy className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-300">No sessions yet</h2>
                        <p className="text-slate-500 mt-2">Start an activity to see your history here.</p>
                    </div>
                ) : (
                    <HistoryClient sessions={sessionsJSON} />
                )}
            </main>
        </div>
    );
}
