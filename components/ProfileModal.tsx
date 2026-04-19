"use client";

import { useEffect, useState } from "react";
import { X, User, Upload, Edit2, Save } from "lucide-react";

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

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: UserProfile;
    onSave: (profile: UserProfile) => Promise<void>;
}

export default function ProfileModal({ isOpen, onClose, profile, onSave }: ProfileModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(profile);

    const hasImageAvatar = formData.avatar.startsWith("data:image/") || formData.avatar.startsWith("http://") || formData.avatar.startsWith("https://");

    useEffect(() => {
        if (isOpen) {
            setFormData(profile);
            setIsEditing(false);
        }
    }, [isOpen, profile]);

    const handleChange = (field: keyof UserProfile, value: any) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-white/10 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-800 border-b border-white/10 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-100">Your Profile</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Profile Picture Section */}
                    <div className="text-center">
                        <div className="mx-auto mb-4 w-28 h-28 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center shadow-lg">
                            {hasImageAvatar ? (
                                <img
                                    src={formData.avatar}
                                    alt="Profile picture"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl text-slate-400">
                                    <User className="w-10 h-10" />
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold border border-cyan-500/30 hover:border-cyan-400/50 cursor-pointer transition-all">
                                <Upload className="w-4 h-4" />
                                Upload PFP
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;

                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            handleChange("avatar", String(reader.result || ""));
                                        };
                                        reader.readAsDataURL(file);
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    {/* Profile Fields */}
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleChange("name", e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                                    placeholder="Your name"
                                />
                            ) : (
                                <p className="mt-1 text-slate-200">{formData.name || "—"}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</label>
                            {isEditing ? (
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange("email", e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                                    placeholder="your@email.com"
                                />
                            ) : (
                                <p className="mt-1 text-slate-200">{formData.email || "—"}</p>
                            )}
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bio</label>
                            {isEditing ? (
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => handleChange("bio", e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none resize-none"
                                    placeholder="Tell us about yourself"
                                    rows={2}
                                />
                            ) : (
                                <p className="mt-1 text-slate-200 text-sm">{formData.bio || "—"}</p>
                            )}
                        </div>

                        {/* Fitness Level */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fitness Level</label>
                            {isEditing ? (
                                <select
                                    value={formData.fitnessLevel}
                                    onChange={(e) => handleChange("fitnessLevel", e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                                >
                                    <option value="beginner">Beginner</option>
                                    <option value="intermediate">Intermediate</option>
                                    <option value="advanced">Advanced</option>
                                    <option value="elite">Elite</option>
                                </select>
                            ) : (
                                <p className="mt-1 text-slate-200 capitalize">{formData.fitnessLevel || "—"}</p>
                            )}
                        </div>

                        {/* Age */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Age</label>
                                {isEditing ? (
                                    <input
                                        type="number"
                                        value={formData.age || ""}
                                        onChange={(e) => handleChange("age", e.target.value ? parseInt(e.target.value) : null)}
                                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                                        placeholder="Age"
                                    />
                                ) : (
                                    <p className="mt-1 text-slate-200">{formData.age || "—"}</p>
                                )}
                            </div>

                            {/* Height */}
                            <div>
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Height</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={formData.height}
                                        onChange={(e) => handleChange("height", e.target.value)}
                                        className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                                        placeholder="e.g., 180cm"
                                    />
                                ) : (
                                    <p className="mt-1 text-slate-200">{formData.height || "—"}</p>
                                )}
                            </div>
                        </div>

                        {/* Weight */}
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weight</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={formData.weight}
                                    onChange={(e) => handleChange("weight", e.target.value)}
                                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-100 focus:border-cyan-500/50 focus:outline-none"
                                    placeholder="e.g., 75kg"
                                />
                            ) : (
                                <p className="mt-1 text-slate-200">{formData.weight || "—"}</p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        {!isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 hover:text-cyan-300 font-semibold transition-all border border-cyan-600/30 hover:border-cyan-500/50"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit Profile
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Close
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-green-400 hover:text-green-300 font-semibold transition-all border border-green-600/30 hover:border-green-500/50 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                                <button
                                    onClick={() => {
                                        setFormData(profile);
                                        setIsEditing(false);
                                    }}
                                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
