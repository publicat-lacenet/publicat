'use client';

import { useState } from 'react';
import { X, MessageSquareWarning } from 'lucide-react';

interface RejectionCommentModalProps {
  isOpen: boolean;
  videoTitle: string;
  onConfirm: (comment: string) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function RejectionCommentModal({
  isOpen,
  videoTitle,
  onConfirm,
  onClose,
  isSubmitting = false,
}: RejectionCommentModalProps) {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const isValid = comment.trim().length >= 10;

  const handleConfirm = () => {
    if (!isValid || isSubmitting) return;
    onConfirm(comment.trim());
    setComment('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setComment('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-bold text-gray-900 font-[family-name:var(--font-montserrat)]">
              Demanar revisió
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 font-[family-name:var(--font-inter)]">
            Escriu un comentari explicant a l&apos;alumne quins canvis ha de fer al vídeo:
          </p>
          <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
            &ldquo;{videoTitle}&rdquo;
          </p>

          <div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: La qualitat d'àudio és massa baixa. Torna a gravar en un lloc silenciós i assegura't que el micròfon és a prop."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-orange-400 resize-none text-sm font-[family-name:var(--font-inter)]"
              autoFocus
            />
            <div className="flex justify-between items-center mt-1">
              <span className={`text-xs ${comment.trim().length < 10 ? 'text-red-500' : 'text-gray-400'}`}>
                {comment.trim().length < 10
                  ? `Mínim 10 caràcters (falten ${10 - comment.trim().length})`
                  : `${comment.length}/1000`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium font-[family-name:var(--font-inter)]"
          >
            Cancel·lar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isValid || isSubmitting}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium font-[family-name:var(--font-inter)] flex items-center gap-2"
          >
            {isSubmitting ? 'Enviant...' : 'Demanar revisió'}
          </button>
        </div>
      </div>
    </div>
  );
}
