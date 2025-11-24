import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import SignOutButton from "./sign-out-button";

export default async function PantallaPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/");
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
            <header className="w-full border-b border-[#E5E7EB] bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/logo_videos.png"
                            alt="Logo PUBLI*CAT"
                            width={48}
                            height={48}
                        />
                        <span className="text-xl font-semibold tracking-tight text-[#111827]">
                            PUBLI*CAT
                        </span>
                    </div>

                    <SignOutButton />
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center space-y-6">
                    <div className="mx-auto w-20 h-20 bg-[#FEDD2C]/20 rounded-full flex items-center justify-center text-4xl">
                        👋
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-[#111827]">
                            Benvingut/da!
                        </h1>
                        <p className="text-[#4B5563]">
                            Has iniciat sessió correctament com a:
                        </p>
                        <p className="font-medium text-[#16AFAA] bg-[#16AFAA]/10 py-2 px-4 rounded-lg inline-block">
                            {user.email}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-[#E5E7EB]">
                        <p className="text-sm text-[#6B7280]">
                            Aquesta és la teva àrea privada. Aviat podràs gestionar els teus vídeos aquí.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
