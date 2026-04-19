import Link from "next/link";
import { Activity, Home, Trophy } from "lucide-react";
import { getAllActivities } from "@/lib/activities";
import { ActivityCard } from "@/components/ActivityCard";
import ProfileButton from "@/components/ProfileButton";

export default function HomePage() {
  const activities = getAllActivities();
  
  const sports = activities.filter(a => a.category === 'sports');
  const workouts = activities.filter(a => a.category === 'workouts');
  const yoga = activities.filter(a => a.category === 'yoga');

  return (
    <div className="pb-24">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 glass-panel border-b border-white/10 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            Sports AI Coach
          </div>
          <ProfileButton />
        </div>
      </nav>

      {/* Header */}
      <header className="pt-24 pb-8 px-6 max-w-7xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          Select <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Activity</span>
        </h1>
        <p className="text-slate-400">Your AI coach is ready. Choose a sport or workout to begin.</p>
      </header>

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* Sports Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-cyan-400" /> Sports
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sports.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>

        {/* Workouts Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" /> Workouts
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workouts.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>

        {/* Yoga Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-fuchsia-400">🧘</span> Yoga
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {yoga.map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 glass-panel border-t border-white/10 z-50">
        <div className="flex justify-center items-center gap-16 py-3 pb-safe">
          <Link href="/" className="flex flex-col items-center gap-1 text-cyan-400">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
          </Link>
          <Link href="/history" className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-medium uppercase tracking-wider">History</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
