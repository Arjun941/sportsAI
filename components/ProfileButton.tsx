"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import ProfileModal from "./ProfileModal";

interface UserProfile {
    userId: string;
    name: string;
    email: string;
    bio: string;
    age: number | null;
    height: string;
    weight: string;
    fitnessLevel: "beginner" | "intermediate" | "advanced" | "elite";
    goals: string[];
    avatar: string;
}

export default function ProfileButton() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const hasImageAvatar = (value: string) => value.startsWith("data:image/") || value.startsWith("http://") || value.startsWith("https://");

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch("/api/profile?userId=default-user");
                const data = await res.json();
                setProfile(data);
            } catch (error) {
                console.error("Failed to load profile:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleSaveProfile = async (updatedProfile: UserProfile) => {
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProfile),
            });
            const data = await res.json();
            setProfile(data);
        } catch (error) {
            console.error("Failed to save profile:", error);
        }
    };

    if (isLoading || !profile) {
        return (
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <User className="w-5 h-5 text-slate-300" />
            </button>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                title={profile.name}
            >
                <span className="w-9 h-9 rounded-full overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center">
                    {hasImageAvatar(profile.avatar) ? (
                        <img
                            src={profile.avatar}
                            alt={profile.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5 text-slate-300" />
                    )}
                </span>
                <span className="text-sm font-medium text-slate-200 group-hover:text-slate-100">{profile.name}</span>
            </button>

            <ProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                profile={profile}
                onSave={handleSaveProfile}
            />
        </>
    );
}
