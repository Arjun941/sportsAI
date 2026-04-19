import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserProfile from "@/lib/models/UserProfile";

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        
        // Get userId from query params or cookies
        const userId = req.nextUrl.searchParams.get("userId") || "default-user";

        const profile = await UserProfile.findOneAndUpdate(
            { userId },
            { $setOnInsert: { userId } },
            { upsert: true, returnDocument: "after" }
        ).lean();

        return NextResponse.json(profile);
    } catch (e) {
        console.error("Profile fetch error:", e);
        return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectToDatabase();
        
        const body = await req.json();
        const { userId, ...updates } = body;
        
        const profile = await UserProfile.findOneAndUpdate(
            { userId: userId || "default-user" },
            { ...updates, updatedAt: new Date() },
            { upsert: true, returnDocument: "after" }
        ).lean();
        
        return NextResponse.json(profile);
    } catch (e) {
        console.error("Profile update error:", e);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
