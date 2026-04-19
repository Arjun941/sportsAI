import mongoose from 'mongoose';

const UserProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, default: () => Math.random().toString(36).substring(7) },
    name: { type: String, default: "Athlete" },
    email: { type: String, default: "" },
    bio: { type: String, default: "" },
    age: { type: Number, default: null },
    height: { type: String, default: "" },
    weight: { type: String, default: "" },
    fitnessLevel: { 
        type: String, 
        enum: ["beginner", "intermediate", "advanced", "elite"],
        default: "intermediate"
    },
    goals: [{ type: String }],
    avatar: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Prevent model recompilation on hot reload
export default mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);
