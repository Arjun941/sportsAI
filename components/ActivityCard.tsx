"use client";

import Link from "next/link";
import { MoveRight } from "lucide-react";
import { motion } from "framer-motion";
import { Activity } from "@/lib/activities";
import clsx from "clsx";

export function ActivityCard({ activity }: { activity: Activity }) {
  return (
    <Link href={`/session/${activity.id}`}>
      <motion.div 
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="relative flex flex-col p-6 rounded-2xl glass-panel group overflow-hidden h-full cursor-pointer transition-all hover:border-cyan-500/40 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(6,182,212,0.15)]"
        style={{ '--card-accent': activity.color } as React.CSSProperties}
      >
        {/* Glow effect */}
        <div 
          className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-[0.06] blur-2xl group-hover:opacity-20 transition-opacity"
          style={{ backgroundColor: activity.color }}
        />

        <div className="text-4xl mb-4 leading-none">{activity.icon}</div>
        
        <h3 className="text-lg font-bold mb-1 tracking-tight">{activity.name}</h3>
        <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{activity.description}</p>
        
        <div className="flex gap-2 flex-wrap mb-4">
          <span className={clsx(
            "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
            activity.category === 'sports' ? 'bg-cyan-500/15 text-cyan-400' :
            activity.category === 'workouts' ? 'bg-emerald-500/15 text-emerald-400' :
            'bg-fuchsia-500/15 text-fuchsia-400'
          )}>
            {activity.category}
          </span>
          {activity.rep_config && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/15 text-amber-400">
              Reps
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300" style={{ color: activity.color }}>
          Start Session <MoveRight className="w-4 h-4" />
        </div>
      </motion.div>
    </Link>
  );
}
