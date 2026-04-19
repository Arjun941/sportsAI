import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Session from "@/lib/models/Session";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { activityId, activityName } = body;
        
        await connectToDatabase();
        
        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const session = await Session.create({
            sessionId,
            activityId,
            activityName,
            startedAt: new Date(),
        });
        
        return NextResponse.json({ session_id: session.sessionId });
    } catch (e) {
        console.error("Session creation error:", e);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }
}

export async function GET() {
    try {
        await connectToDatabase();
        
        const sessions = await Session.find().sort({ startedAt: -1 }).limit(30).lean();
        
        return NextResponse.json(sessions);
    } catch (e) {
        console.error("Session fetch error:", e);
        return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }
}
