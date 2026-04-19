import { notFound } from "next/navigation";
import { getActivity } from "@/lib/activities";
import ClientSessionWrapper from "@/components/ClientSessionWrapper";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
    const p = await params;
    const activity = getActivity(p.id);
    
    if (!activity) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-black overflow-hidden relative">
            <ClientSessionWrapper activity={activity} />
        </main>
    );
}
