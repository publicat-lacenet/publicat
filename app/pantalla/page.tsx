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

    // Comprovar el rol de l'usuari i redirigir si no és display
    const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    // Si l'usuari no és display, redirigir segons el seu rol
    if (profile?.role === 'admin_global') {
        redirect('/admin');
    } else if (profile?.role === 'editor_profe' || profile?.role === 'editor_alumne') {
        redirect('/contingut');
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
                <div className="max-w-4xl w-full">
                    <h1 className="text-3xl font-bold text-[#111827] mb-8">
                        Pantalla de Reproducció
                    </h1>
                    <div className="bg-white rounded-xl shadow-lg p-8">
                        <p className="text-[#4B5563] text-center">
                            Vista de reproducció per a pantalles públiques.
                            <br />
                            <span className="text-sm text-[#6B7280] mt-2 inline-block">
                                (Aquesta pàgina es desenvoluparà al Milestone M6)
                            </span>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
