import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Session from "@/lib/models/Session";
import { generateAnalyticsInsightsText } from "@/lib/analyticsInsights";

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

        const insightsText = await generateAnalyticsInsightsText(session);

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

        const prompt = { activityName, metrics, repCount, duration, feedbackLog };

        const responseText = await generateAnalyticsInsightsText({
            ...prompt,
            durationSecs: duration,
        });

        return NextResponse.json({ insightsText: responseText });
    } catch (e) {
        console.error("Analytics insights error:", e);
        return NextResponse.json({ insightsText: "", error: "Failed to generate insights" }, { status: 500 });
    }
}
