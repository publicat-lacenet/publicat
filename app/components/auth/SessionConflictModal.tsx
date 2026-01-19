'use client';

interface SessionConflictModalProps {
  isOpen: boolean;
  currentUserEmail: string | null;
  onConfirmSwitch: () => void;
  onCancel: () => void;
}

export default function SessionConflictModal({
  isOpen,
  currentUserEmail,
  onConfirmSwitch,
  onCancel,
}: SessionConflictModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl pointer-events-auto">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--color-dark)] font-[family-name:var(--font-montserrat)]">
                  Sessió activa detectada
                </h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-4">
            <p className="text-[var(--color-dark)] font-[family-name:var(--font-inter)]">
              Ja hi ha una sessió oberta amb el compte:
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-900 font-[family-name:var(--font-inter)] break-all">
                {currentUserEmail}
              </p>
            </div>
            <p className="text-sm text-gray-600 font-[family-name:var(--font-inter)]">
              Per iniciar sessió amb un altre compte, primer has de tancar la sessió actual.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-800 font-[family-name:var(--font-inter)]">
                ℹ️ <strong>Nota:</strong> Només pots tenir una sessió activa al mateix temps en aquest navegador.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300 font-[family-name:var(--font-inter)]"
            >
              Cancel·lar
            </button>
            <button
              onClick={onConfirmSwitch}
              className="flex-1 px-4 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-secondary)] text-white rounded-lg font-medium transition-colors font-[family-name:var(--font-inter)]"
            >
              Tancar sessió i continuar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
