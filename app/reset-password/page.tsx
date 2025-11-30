"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  
  const supabase = createClient();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/reset-password/confirm`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-[#16AFAA]/10 rounded-full flex items-center justify-center">
            <span className="text-4xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-[#111827]">Comprova el teu correu</h2>
          <p className="text-[#4B5563]">
            T&apos;hem enviat un enllaç per restablir la contrasenya a{" "}
            <strong className="text-[#111827]">{email}</strong>
          </p>
          <p className="text-sm text-[#6B7280]">
            L&apos;enllaç caducarà en 60 minuts per motius de seguretat.
          </p>
          <Link
            href="/login"
            className="inline-block rounded-full bg-[#16AFAA] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#11948F] transition-colors"
          >
            Tornar a l&apos;inici de sessió
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
            <h1 className="text-2xl font-bold text-[#111827]">Restablir contrasenya</h1>
            <p className="text-sm text-[#4B5563]">
              Introdueix el teu correu i t&apos;enviarem un enllaç
            </p>
          </div>

          {error && (
            <div className="bg-[#F91248]/10 border border-[#F91248]/20 rounded-lg p-3 text-sm text-[#F91248]">
              {error}
            </div>
          )}

          <form onSubmit={handleReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#16AFAA] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#11948F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enviant..." : "Enviar enllaç"}
            </button>
          </form>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-[#4B5563] hover:text-[#111827]"
            >
              ← Tornar a l&apos;inici de sessió
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
