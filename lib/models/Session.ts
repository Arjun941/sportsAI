import mongoose from 'mongoose';

const FitnessSnapshotSchema = new mongoose.Schema({
    timestamp: { type: Number, required: true },
    heart_rate: { type: Number, required: true },
    spo2: { type: Number, required: true },
    cadence: { type: Number, required: true }
});

const SessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    activityId: { type: String, required: true },
    activityName: { type: String, required: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    durationSecs: { type: Number },
    repCount: { type: Number, default: 0 },
    metrics: { type: mongoose.Schema.Types.Mixed },
    analyticsInsightsText: { type: String, default: "" },
    analyticsInsightsGeneratedAt: { type: Date },
    feedbackLog: [{ type: String }],
    fitnessData: [FitnessSnapshotSchema]
}, { timestamps: true });

// Prevent model recompilation on hot reload
export default mongoose.models.Session || mongoose.model('Session', SessionSchema);
