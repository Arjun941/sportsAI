import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getActivity, LM } from "@/lib/activities";
import connectToDatabase from "@/lib/mongodb";
import Session from "@/lib/models/Session";

type AngleBreakdown = {
    name: string;
    angle: number;
    ideal: [number, number];
    status: string;
};

type CoachRequestBody = {
    activityId: string;
    frames?: string[];
    landmarks?: any[];
    fitnessData?: {
        heart_rate: number;
        spo2: number;
        cadence: number;
    };
    sessionId?: string;
    currentRepPhase?: string;
    repNumber?: number;
    repDuration?: number;
    velocity?: number;
    acceleration?: number;
    formScore?: number;
    angleBreakdowns?: AngleBreakdown[];
    poseQuality?: number;
    isIncompleteRep?: boolean;
    isTooFast?: boolean;
};

// Use the new GoogleGenAI SDK as required by the deprecation notice
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            activityId, frames, landmarks, fitnessData, sessionId,
            currentRepPhase, repNumber, repDuration, velocity, acceleration,
            formScore, angleBreakdowns, poseQuality, isIncompleteRep, isTooFast
        } = body as CoachRequestBody;
        const safePoseQuality = poseQuality ?? 0;
        const safeFormScore = formScore ?? 0;
        const safeVelocity = velocity ?? 0;
        const safeAcceleration = acceleration ?? 0;
        const safeRepDuration = repDuration ?? 0;

        const activity = getActivity(activityId);
        if (!activity) {
            return NextResponse.json({ error: "Unknown activity" }, { status: 400 });
        }

        const prompt = [activity.coaching_prompt];

        // ===== NEW: Movement Context =====
        if (currentRepPhase && repNumber !== undefined) {
            prompt.push(
                `--- CURRENT REP CONTEXT ---\n` +
                `Rep #: ${repNumber} | Phase: ${currentRepPhase.toUpperCase()}\n` +
                `Duration: ${safeRepDuration}ms | Velocity: ${safeVelocity}°/sec | Acceleration: ${safeAcceleration}°/sec²\n` +
                `Pose Quality: ${(safePoseQuality * 100).toFixed(0)}% | Form Score: ${(safeFormScore * 100).toFixed(0)}%`
            );
        }

        // ===== NEW: Quality Flags =====
        const qualityIssues = [];
        if (isIncompleteRep) qualityIssues.push("incomplete range of motion");
        if (isTooFast) qualityIssues.push("moving too fast");
        if (safeFormScore < 0.7) qualityIssues.push("form breaking down");
        if (safePoseQuality < 0.6) qualityIssues.push("low visibility");
        
        if (qualityIssues.length > 0) {
            prompt.push(`⚠ QUALITY FLAGS: ${qualityIssues.join(", ")}`);
        }

        // ===== NEW: Use breakdown data if available =====
        if (angleBreakdowns && angleBreakdowns.length > 0) {
            const breakdownLines = angleBreakdowns
                .map((bd: AngleBreakdown) => `${bd.name}: ${bd.angle}° (ideal ${bd.ideal[0]}-${bd.ideal[1]}°) ${bd.status}`)
                .join("\n");
            prompt.push(`--- FORM BREAKDOWN ---\n${breakdownLines}`);
        }

        // Format recent landmarks if available (fallback if breakdowns not sent)
        if ((!angleBreakdowns || angleBreakdowns.length === 0) && landmarks && landmarks.length > 0 && landmarks[0]) {
            const recent = landmarks[landmarks.length - 1];
            if (recent && activity.angles_to_track) {
                let lines = [];
                for (const angleCfg of activity.angles_to_track) {
                    const pts = angleCfg.points;
                    if (pts && pts.length === 3) {
                        const p1 = recent[pts[0]];
                        const p2 = recent[pts[1]];
                        const p3 = recent[pts[2]];
                        if (p1 && p2 && p3 && (p1.visibility ?? 1) > 0.5 && (p2.visibility ?? 1) > 0.5 && (p3.visibility ?? 1) > 0.5) {
                            // Calculate angle
                            const v1x = p1.x - p2.x, v1y = p1.y - p2.y;
                            const v2x = p3.x - p2.x, v2y = p3.y - p2.y;
                            const dot = v1x * v2x + v1y * v2y;
                            const mag1 = Math.sqrt(v1x*v1x + v1y*v1y) + 1e-9;
                            const mag2 = Math.sqrt(v2x*v2x + v2y*v2y) + 1e-9;
                            const cosA = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
                            const angle = Math.round(Math.acos(cosA) * (180.0 / Math.PI));
                            const ideal = angleCfg.ideal || [0, 180];
                            const status = (angle >= ideal[0] && angle <= ideal[1]) ? "✓" : "⚠";
                            lines.push(`${angleCfg.name}: ${angle}° (ideal ${ideal[0]}-${ideal[1]}°) ${status}`);
                        }
                    }
                }
                if (lines.length > 0) {
                    prompt.push(`--- CURRENT POSE DATA ---\n${lines.join("\n")}`);
                }
            }
        }

        // Add fitness data if provided
        if (fitnessData) {
            prompt.push(
                `--- FITNESS DEVICE DATA ---\nHeart Rate: ${fitnessData.heart_rate}bpm\nSpO2: ${fitnessData.spo2}%\nCadence: ${fitnessData.cadence} rpm\n` +
                `\nIntegrate the fitness data naturally if relevant (e.g. 'heart rate is climbing, ease up' or 'great intensity').`
            );
        }

        prompt.push(
            "You're coaching this person RIGHT NOW. Give ONE piece of direct, " +
            "encouraging feedback based on what you see. Keep it to 1-2 sentences, " +
            "natural and actionable. Sound like a REAL coach!"
        );

        // Add base64 frames to the prompt
        let parts: any[] = [{ text: prompt.join("\n\n") }];

        if (frames && Array.isArray(frames)) {
            for (const b64 of frames) {
                if (b64) {
                    parts.push({
                        inlineData: {
                            data: b64,
                            mimeType: "image/jpeg",
                        }
                    });
                }
            }
        }
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts }],
            config: {
                systemInstruction: "You are a charismatic, high-energy live sports coach.",
                temperature: 0.7,
            }
        });

        const feedback = response.text || "Keep it up!";
        console.log("[GEMINI RESPONSE]:", feedback);

        // Optionally, push this feedback to MongoDB asyncly if sessionId is provided
        if (sessionId) {
            connectToDatabase().then(() => {
                Session.updateOne(
                    { sessionId },
                    { $push: { feedbackLog: feedback } }
                ).exec();
            }).catch(console.error);
        }

        return NextResponse.json({ text: feedback });

    } catch (e) {
        console.error("Gemini AI API Error:", e);
        return NextResponse.json({ error: "Failed to process coaching frame" }, { status: 500 });
    }
}
