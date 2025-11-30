"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function ConfirmInviteContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Verificar si hay un token de invitación
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const tokenError = !token || type !== 'invite';

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Les contrasenyes no coincideixen");
      return;
    }

    if (password.length < 6) {
      setError("La contrasenya ha de tenir almenys 6 caràcters");
      return;
    }

    setLoading(true);

    // Actualizar la contraseña del usuario invitado
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/pantalla");
      router.refresh();
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-[#111827]">Enllaç invàlid</h2>
          <p className="text-[#4B5563]">
            Aquest enllaç d&apos;invitació no és vàlid o ha caducat.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-[#16AFAA] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#11948F] transition-colors"
          >
            Anar a l&apos;inici de sessió
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <header className="w-full border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo_videos.png"
              alt="Logo PUBLI*CAT"
              width={48}
              height={48}
            />
            <span className="text-xl font-semibold tracking-tight text-[#111827]">
              PUBLI*CAT
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 bg-[#16AFAA]/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-2xl font-bold text-[#111827]">Benvingut a PUBLI*CAT!</h1>
            <p className="text-sm text-[#4B5563]">
              Crea la teva contrasenya per accedir a la plataforma
            </p>
          </div>

          {error && (
            <div className="bg-[#F91248]/10 border border-[#F91248]/20 rounded-lg p-3 text-sm text-[#F91248]">
              {error}
            </div>
          )}

          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#111827] mb-1">
                Contrasenya
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16AFAA] text-[#111827]"
              />
              <p className="mt-1 text-xs text-[#6B7280]">
                Mínim 6 caràcters
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#111827] mb-1">
                Confirma la contrasenya
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16AFAA] text-[#111827]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#F91248] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[#d70f3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creant compte..." : "Crear compte"}
            </button>
          </form>

          <div className="pt-4 border-t border-[#E5E7EB] text-center">
            <p className="text-xs text-[#6B7280]">
              En crear el teu compte, acceptes les condicions d&apos;ús de la plataforma del centre educatiu.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfirmInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F91248] mx-auto"></div>
          <p className="mt-4 text-[#6B7280]">Carregant...</p>
        </div>
      </div>
    }>
      <ConfirmInviteContent />
    </Suspense>
  );
}
