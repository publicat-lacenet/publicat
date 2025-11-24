"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
    const router = useRouter();
    const supabase = createClient();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/");
    };

    return (
        <button
            onClick={handleSignOut}
            className="rounded-full bg-[#F91248] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#d70f3d] transition-colors cursor-pointer"
        >
            Tancar sessió
        </button>
    );
}
