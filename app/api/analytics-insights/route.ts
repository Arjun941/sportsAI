import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import connectToDatabase from "@/lib/mongodb";
import Session from "@/lib/models/Session";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildPrompt({ activityName, metrics, repCount, duration, feedbackLog }: any) {
    return `You are a fitness coach analyzing a completed workout session.

WORKOUT SESSION SUMMARY:
- Activity: ${activityName}
- Duration: ${duration} seconds (${Math.round(duration / 60)} minutes)
- Total Reps: ${repCount}
- Average Form Score: ${Math.round((metrics.avgFormScore || 0) * 100)}%
- Form Range: ${Math.round((metrics.minFormScore || 0) * 100)}%-${Math.round((metrics.maxFormScore || 0) * 100)}%
- Average Heart Rate: ${Math.round(metrics.avgHR || 0)} bpm (${Math.round(metrics.minHR || 0)}-${Math.round(metrics.maxHR || 0)})
- Average SpO2: ${Math.round(metrics.avgSpO2 || 0)}% (min: ${Math.round(metrics.minSpO2 || 0)}%)
- Rep Consistency: ${Math.round((metrics.repConsistency || 0) * 100)}%
- Total Feedback Cues: ${metrics.totalFeedback || 0}

Write 3 to 4 short plain-text insights for the athlete.
Requirements:
- Output plain text only.
- Do not use markdown, bullets, numbering, headings, emojis, or labels.
- Use simple sentences or short paragraphs.
- Be specific, actionable, encouraging, and honest.
- Mention what they did well, one area to improve, one recommendation for next session, and one motivational note.`;
}

async function generateInsights(session: any) {
    const prompt = buildPrompt({
        activityName: session.activityName,
        metrics: session.metrics,
        repCount: session.repCount,
        duration: session.durationSecs || 0,
        feedbackLog: session.feedbackLog || [],
    });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
            temperature: 0.7,
        }
    });

    return (response.text || "").trim();
}

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const sessionId = req.nextUrl.searchParams.get("sessionId");

        if (!sessionId) {
            return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
        }

        const session = await Session.findOne({ sessionId });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        if (session.analyticsInsightsText) {
            return NextResponse.json({
                insightsText: session.analyticsInsightsText,
                generatedAt: session.analyticsInsightsGeneratedAt,
                cached: true,
            });
        }

        if (!session.metrics) {
            return NextResponse.json({ insightsText: "", cached: false });
        }

        const insightsText = await generateInsights(session);

        session.analyticsInsightsText = insightsText;
        session.analyticsInsightsGeneratedAt = new Date();
        await session.save();

        return NextResponse.json({ 
            insightsText,
            generatedAt: session.analyticsInsightsGeneratedAt,
            cached: false,
        });

    } catch (e) {
        console.error("Analytics insights error:", e);
        return NextResponse.json({ insightsText: "", error: "Failed to generate insights" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { activityName, metrics, repCount, duration, feedbackLog } = body;

        if (!metrics) {
            return NextResponse.json({ insightsText: "" });
        }

        const prompt = buildPrompt({ activityName, metrics, repCount, duration, feedbackLog });

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7,
            }
        });

        return NextResponse.json({ insightsText: (response.text || "").trim() });
    } catch (e) {
        console.error("Analytics insights error:", e);
        return NextResponse.json({ insightsText: "", error: "Failed to generate insights" }, { status: 500 });
    }
}
