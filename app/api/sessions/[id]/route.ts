import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Session from "@/lib/models/Session";
import { generateAnalyticsInsightsText } from "@/lib/analyticsInsights";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const p = await params;
        const body = await req.json();
        const { repCount, metrics, durationSecs } = body;
        
        await connectToDatabase();
        
        const session = await Session.findOne({ sessionId: p.id });
        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        
        session.endedAt = new Date();
        if (session.startedAt) {
            session.durationSecs = durationSecs || Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000);
        }
        
        if (repCount !== undefined) session.repCount = repCount;
        if (metrics !== undefined) session.metrics = metrics;
        
        await session.save();

        try {
            const analyticsInsightsText = await generateAnalyticsInsightsText(session);
            if (analyticsInsightsText) {
                session.analyticsInsightsText = analyticsInsightsText;
                session.analyticsInsightsGeneratedAt = new Date();
                await session.save();
            }
        } catch (analyticsError) {
            console.error("Analytics precompute error:", analyticsError);
        }
        
        return NextResponse.json({ success: true, session });
    } catch (e) {
        console.error("Session end error:", e);
        return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
    }
}
