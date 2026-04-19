import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { 
            heartRate, 
            spo2, 
            cadence, 
            repCount, 
            timer, 
            formScore,
            previousHR,
            previousSpO2,
            activityName
        } = body;

        // Detect significant changes
        const hrChange = Math.abs(heartRate - (previousHR || heartRate));
        const spo2Change = Math.abs(spo2 - (previousSpO2 || spo2));
        
        // Only trigger feedback on significant changes or thresholds
        const triggers = [];
        
        if (hrChange > 10 || heartRate > 170 || heartRate < 50) triggers.push(`Heart rate is now ${heartRate} bpm`);
        if (spo2Change > 2 || spo2 < 90) triggers.push(`SpO2 dropped to ${spo2}%`);
        if (formScore < 0.7) triggers.push("Form is breaking down");
        if (cadence > 100) triggers.push("Moving very fast");
        if (heartRate > 170) triggers.push("Critical heart rate");
        
        if (triggers.length === 0) {
            return NextResponse.json({ feedback: null });
        }

        const prompt = `You are a live fitness coach. The athlete's fitness metrics just changed significantly:

${triggers.join("\n")}

Current stats:
- Heart Rate: ${heartRate} bpm
- SpO2: ${spo2}%
- Reps: ${repCount}
- Time: ${timer}s
- Form Score: ${Math.round(formScore * 100)}%
- Activity: ${activityName}

Give ONE short, direct coaching cue (1-2 sentences, like a real coach would say in the moment):
- If HR is too high: encourage them to slow down/ease up
- If SpO2 is dropping: tell them to stop or take a break
- If form is bad: give specific form correction
- If they're doing great: encourage them
- Keep it natural and urgent (use "hey" or "watch out" tone)
DO NOT sound like an AI. Sound like a real person coaching them RIGHT NOW.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.8,
            }
        });

        const feedback = response.text || null;
        
        return NextResponse.json({ 
            feedback,
            triggers,
            severity: heartRate > 170 || spo2 < 90 ? "critical" : hrChange > 15 || spo2Change > 3 ? "warning" : "info"
        });

    } catch (e) {
        console.error("Fitness feedback error:", e);
        return NextResponse.json({ feedback: null }, { status: 500 });
    }
}
