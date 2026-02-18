import Image from "next/image";
import Link from "next/link";
import LandingVideoPlayer from "@/app/components/landing/LandingVideoPlayer";

export default function Home() {

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB]">
      <header className="w-full border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo_videos.png"
              alt="Logo PUBLICAT"
              width={48}
              height={48}
            />
            <span className="text-xl font-semibold tracking-tight text-[#111827]">
              PUBLICAT
            </span>
          </div>

          <Link
            href="/login"
            className="rounded-full bg-[#16AFAA] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#11948F] transition-colors"
          >
            Inicia la sessió
          </Link>
        </div>
      </header>

      <main id="inici" className="flex-1">
        <section className="bg-linear-to-r from-[#FEDD2C]/80 to-[#FFF7CF]">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-10 px-6 py-16 lg:flex-row lg:items-center lg:py-20">
            <div className="flex-1 space-y-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#F91248]">
                PUBLICAT - Comunicant el futur
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-[#111827] sm:text-5xl">
                Periodisme digital per a centres educatius
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[#4B5563]">
                El projecte PUBLICAT proporciona estratègies i recursos per crear i difondre contingut en català, fomentant l’esperit crític i desenvolupant la pròpia opinió davant de les fake news i el nou panorama de manipulació informativa.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="rounded-full bg-[#F91248] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#d70f3d] transition-colors"
                >
                  Inicia la sessió
                </Link>
              </div>
            </div>

            <div className="flex-1 group">
              <LandingVideoPlayer />
            </div>
          </div>
        </section>

        <section
          id="objectius"
          className="border-t border-[#E5E7EB] bg-white"
        >
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="mb-10 text-center text-3xl font-bold text-[#111827]">
              PUBLICAT (Visió pedagògica)
            </h2>

            <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* LLENGUA CATALANA — top left */}
              <div className="rounded-2xl bg-gradient-to-l from-[#3ECDB0] to-[#1E8C72] p-7 text-white">
                <h3 className="mb-3 text-xl font-extrabold uppercase tracking-wide">
                  Llengua catalana
                </h3>
                <p className="text-base leading-relaxed">
                  Creació de continguts en català, desenvolupant l&apos;expressió oral i escrita, simulant contextos professionals en situacions pròximes i reals, explorant el nou format digital signage educatiu.
                </p>
              </div>

              {/* PLA DIGITALITZACIÓ DE CENTRE — top right */}
              <div className="rounded-2xl bg-gradient-to-l from-[#FEDD2C] to-[#C9A020] p-7 text-white">
                <h3 className="mb-3 text-xl font-extrabold uppercase tracking-wide">
                  Pla digitalització de centre
                </h3>
                <p className="text-base leading-relaxed">
                  Optimització i utilització dels recursos de la maleta digital per la producció de continguts en català i pel desenvolupament de la competència digital.
                </p>
              </div>

              {/* ESPERIT CRÍTIC — bottom left */}
              <div className="rounded-2xl bg-gradient-to-l from-[#F07068] to-[#B83A32] p-7 text-white">
                <h3 className="mb-3 text-xl font-extrabold uppercase tracking-wide">
                  Esperit crític
                </h3>
                <p className="text-base leading-relaxed">
                  Desenvolupar l&apos;esperit crític, creant oportunitats per conformar l&apos;opinió i el sentit comú davant les fake news i la manipulació informativa.
                </p>
              </div>

              {/* IMPULS DELS PLANS D'ENTORN — bottom right */}
              <div className="rounded-2xl bg-gradient-to-l from-[#7B93D8] to-[#3E59A8] p-7 text-white">
                <h3 className="mb-3 text-xl font-extrabold uppercase tracking-wide">
                  Impuls dels plans d&apos;entorn
                </h3>
                <p className="text-base leading-relaxed">
                  Vincular en un mateix programa centres educatius, ajuntaments, entitats locals i organitzacions culturals.
                </p>
              </div>

              {/* Central gear "PER QUÈ?" */}
              <div className="pointer-events-none absolute inset-0 hidden items-center justify-center md:flex">
                <div className="relative flex h-32 w-32 items-center justify-center">
                  <svg className="absolute h-32 w-32 text-[#374151] drop-shadow-xl" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1s.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64L19.43 12.97Z" />
                  </svg>
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#374151]">
                    <div className="text-center">
                      <span className="block text-base font-extrabold leading-tight text-white">
                        PER
                      </span>
                      <span className="block text-base font-extrabold leading-tight text-white">
                        QUÈ?
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer
          className="border-t border-[#E5E7EB] bg-white text-sm text-[#6B7280]"
        >
          <div className="mx-auto max-w-6xl px-6 py-8">
            <div className="flex flex-wrap items-center justify-center gap-8 mb-6">
              <Image
                src="/logo_lacenet.png"
                alt="LaceNet"
                width={180}
                height={60}
                className="h-14 w-auto object-contain"
              />
              <Image
                src="/logo_gencat.png"
                alt="Generalitat de Catalunya - Departament d'Educació i Formació Professional"
                width={280}
                height={60}
                className="h-14 w-auto object-contain"
              />
              <Image
                src="/logo_crp_bages.png"
                alt="Servei Educatiu del Bages - CRP"
                width={180}
                height={60}
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col items-center justify-between gap-2 border-t border-[#E5E7EB] pt-4 md:flex-row">
              <p>© {new Date().getFullYear()} PUBLICAT</p>
              <p className="text-xs">
                Plataforma pilot per a centres educatius · Desenvolupament intern
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
