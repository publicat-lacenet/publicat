export default function AuthCodeError() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto w-16 h-16 bg-[#F91248]/10 rounded-full flex items-center justify-center">
                        <span className="text-3xl">⚠️</span>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-[#111827] mb-3">
                    Error d'autenticació
                </h1>

                <p className="text-[#4B5563] mb-6">
                    Hi ha hagut un problema amb l'inici de sessió. Si us plau, torna-ho a intentar.
                </p>

                <a
                    href="/"
                    className="inline-block rounded-full bg-[#16AFAA] px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#11948F] transition-colors"
                >
                    Tornar a l'inici
                </a>

                <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg text-left">
                    <p className="text-xs text-[#6B7280] mb-2">
                        <strong>Possibles causes:</strong>
                    </p>
                    <ul className="text-xs text-[#6B7280] space-y-1 list-disc list-inside">
                        <li>El codi d'autenticació ha expirat</li>
                        <li>La URL de redirecció no està configurada correctament</li>
                        <li>Hi ha hagut un error de connexió</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
