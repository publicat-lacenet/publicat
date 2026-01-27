import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DisplayScreenWrapper from "./DisplayScreenWrapper";

export default async function PantallaPage({
    searchParams,
}: {
    searchParams: Promise<{ playlist?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/");
    }

    // Obtenir el perfil de l'usuari
    const { data: profile } = await supabase
        .from('users')
        .select('role, center_id')
        .eq('id', user.id)
        .single();

    // Verificar permisos (display, editor_profe, editor_alumne, admin_global)
    if (!profile || !['display', 'editor_profe', 'editor_alumne', 'admin_global'].includes(profile.role)) {
        redirect('/');
    }

    // Verificar que té center_id
    if (!profile.center_id) {
        redirect('/');
    }

    return (
        <DisplayScreenWrapper
            centerId={profile.center_id}
            playlistOverride={params.playlist}
            userRole={profile.role}
        />
    );
}
