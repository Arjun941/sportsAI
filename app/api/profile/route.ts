import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import UserProfile from "@/lib/models/UserProfile";

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        
        // Get userId from query params or cookies
        const userId = req.nextUrl.searchParams.get("userId") || "default-user";
        
        let profile = await UserProfile.findOne({ userId }).lean();
        
        if (!profile) {
            // Create default profile if doesn't exist
            const newProfile = new UserProfile({ userId });
            profile = await newProfile.save();
        }
        
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
            { new: true, upsert: true }
        ).lean();
        
        return NextResponse.json(profile);
    } catch (e) {
        console.error("Profile update error:", e);
        return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }
}
