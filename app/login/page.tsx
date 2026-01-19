"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SessionConflictModal from "@/app/components/auth/SessionConflictModal";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{email: string, password: string} | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Comprobar si ya hay una sesión activa al cargar la página
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Hay una sesión activa, redirigir al dashboard
        router.push("/dashboard");
      }
    };
    checkExistingSession();
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Comprobar si ya hay una sesión activa
    const { data: { user: existingUser } } = await supabase.auth.getUser();

    if (existingUser && existingUser.email !== email) {
      // Hay una sesión activa con otro usuario
      setCurrentUserEmail(existingUser.email || null);
      setPendingCredentials({ email, password });
      setShowSessionModal(true);
      setLoading(false);
      return;
    }

    // No hay sesión o es el mismo usuario, proceder con login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  const handleConfirmSwitch = async () => {
    if (!pendingCredentials) return;

    setShowSessionModal(false);
    setLoading(true);

    // Cerrar sesión actual
    await supabase.auth.signOut();

    // Limpiar sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
    }

    // Esperar un momento para asegurar que la sesión se cerró
    await new Promise(resolve => setTimeout(resolve, 500));

    // Intentar login con las nuevas credenciales
    const { error } = await supabase.auth.signInWithPassword({
      email: pendingCredentials.email,
      password: pendingCredentials.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }

    setPendingCredentials(null);
  };

  const handleCancelSwitch = () => {
    setShowSessionModal(false);
    setPendingCredentials(null);
    setCurrentUserEmail(null);
    setLoading(false);
    // Redirigir al dashboard de la sesión actual
    router.push("/dashboard");
  };

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
            <h1 className="text-2xl font-bold text-[#111827]">Inicia la sessió</h1>
            <p className="text-sm text-[#4B5563]">
              Accedeix amb el teu compte del centre
            </p>
          </div>

          {error && (
            <div className="bg-[#F91248]/10 border border-[#F91248]/20 rounded-lg p-3 text-sm text-[#F91248]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#111827] mb-1">
                Correu electrònic
              </label>
              <input
                id="email"
                type="email"
                placeholder="nom@centre.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16AFAA] text-[#111827]"
              />
            </div>

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
                className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16AFAA] text-[#111827]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#F91248] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#d70f3d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Carregant..." : "Entrar"}
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/reset-password"
              className="text-sm text-[#16AFAA] hover:text-[#11948F] font-medium"
            >
              Has oblidat la contrasenya?
            </Link>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] text-center">
            <p className="text-sm text-[#4B5563]">
              No tens compte?{" "}
              <span className="text-[#16AFAA] font-semibold">
                Contacta amb l&apos;administrador
              </span>
            </p>
          </div>
        </div>
      </main>

      {/* Modal de conflicto de sesión */}
      <SessionConflictModal
        isOpen={showSessionModal}
        currentUserEmail={currentUserEmail}
        onConfirmSwitch={handleConfirmSwitch}
        onCancel={handleCancelSwitch}
      />
    </div>
  );
}
