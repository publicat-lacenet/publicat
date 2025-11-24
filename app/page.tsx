"use client";

import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

export default function Home() {
  const supabase = createClient();

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  };

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

          <button
            onClick={handleLogin}
            className="rounded-full bg-[#16AFAA] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#11948F] transition-colors cursor-pointer"
          >
            Inicia la sessió
          </button>
        </div>
      </header>

      <main id="inici" className="flex-1">
        <section className="bg-linear-to-r from-[#FEDD2C]/80 to-[#FFF7CF]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-10 px-6 py-16 lg:flex-row lg:items-center lg:py-20">
            <div className="flex-1 space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F91248]">
                Programa de vídeo per a centres educatius
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-[#111827] sm:text-5xl">
                Centralitza, organitza i comparteix
                <br />
                el vídeo educatiu del teu centre.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[#4B5563]">
                La plataforma PUBLI*CAT permet als centres pujar i gestionar
                els seus vídeos educatius de forma segura, amb llistes de
                reproducció per pantalles informatives i un accés controlat per
                professorat i alumnat.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleLogin}
                  className="rounded-full bg-[#F91248] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#d70f3d] transition-colors cursor-pointer"
                >
                  Inicia la sessió
                </button>
              </div>
            </div>

            <div className="flex-1">
              <div className="relative mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl">
                <div className="mb-6 flex justify-center">
                  <div className="rounded-2xl bg-linear-to-br from-[#FEDD2C] to-[#FEDD2C]/60 p-6 shadow-lg">
                    <Image
                      src="/logo_videos.png"
                      alt="Logo PUBLI*CAT"
                      width={120}
                      height={120}
                    />
                  </div>
                </div>

                <div className="space-y-5 text-center">
                  <h3 className="text-xl font-bold leading-tight text-[#111827]">
                    PUBLI*CAT és una plataforma pensada per donar visibilitat a l&apos;aprenentatge dels centres.
                  </h3>

                  <div className="space-y-4 text-left">
                    <div className="rounded-xl bg-[#F9FAFB] p-4">
                      <p className="text-sm leading-relaxed text-[#4B5563]">
                        <span className="font-semibold text-[#F91248]">Facilita la pujada i organització</span> de vídeos educatius, permet crear playlists per a pantalles del centre i reforça la comunicació interna.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#F9FAFB] p-4">
                      <p className="text-sm leading-relaxed text-[#4B5563]">
                        Amb una gestió senzilla i segura, PUBLI*CAT converteix el vídeo en una <span className="font-semibold text-[#16AFAA]">eina per compartir projectes</span>, fomentar la participació de l&apos;alumnat i impulsar la competència digital a tots els nivells.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="objectius"
          className="border-t border-[#E5E7EB] bg-white"
        >
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="mb-4 text-center text-3xl font-bold text-[#111827]">
              Objectius de PUBLI*CAT
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-[#4B5563]">
              Donar als centres educatius una eina senzilla per gestionar
              contingut audiovisual propi, fomentar la comunicació interna i
              compartir projectes d’alumnat en espais visibles del centre.
            </p>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl bg-[#F9FAFB] p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-xl bg-[#FEDD2C]/30 p-2">
                  <span className="text-lg">🎬</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#111827]">
                  Centralitzar vídeos
                </h3>
                <p className="text-sm text-[#4B5563]">
                  Un únic espai per desar, catalogar i recuperar tots els vídeos
                  educatius del centre, vinculats a matèries i projectes.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F9FAFB] p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-xl bg-[#16AFAA]/20 p-2">
                  <span className="text-lg">📺</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#111827]">
                  Llistes per pantalles
                </h3>
                <p className="text-sm text-[#4B5563]">
                  Crear playlists per al vestíbul, biblioteca o menjador amb
                  contingut seleccionat i actualitzable fàcilment.
                </p>
              </div>

              <div className="rounded-2xl bg-[#F9FAFB] p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-xl bg-[#F91248]/15 p-2">
                  <span className="text-lg">🔐</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[#111827]">
                  Control d’accés
                </h3>
                <p className="text-sm text-[#4B5563]">
                  Accés restringit a usuaris del centre i integració amb
                  plataformes de vídeo com Vimeo per garantir la privadesa.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer
          className="border-t border-[#E5E7EB] bg-white text-sm text-[#6B7280]"
        >
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 md:flex-row">
            <p>© {new Date().getFullYear()} PUBLI*CAT</p>
            <p className="text-xs">
              Plataforma pilot per a centres educatius · Desenvolupament intern
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
