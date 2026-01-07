'use client';

import { useVimeoValidation } from '@/hooks/useVimeoValidation';
import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface VimeoMetadata {
  vimeo_id?: string;
  title?: string;
  duration?: number;
  thumbnail_url?: string;
}

interface VimeoUrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange: (isValid: boolean, metadata?: VimeoMetadata) => void;
}

export default function VimeoUrlInput({ value, onChange, onValidationChange }: VimeoUrlInputProps) {
  const { state, error, metadata, validate, reset } = useVimeoValidation();
  const prevValueRef = useRef(value);
  const onValidationChangeRef = useRef(onValidationChange);
  
  // Mantener referencia actualizada del callback en un efecto
  useEffect(() => {
    onValidationChangeRef.current = onValidationChange;
  });

  useEffect(() => {
    // Solo validar si el valor cambió realmente
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;
    
    if (value.trim()) {
      validate(value);
    } else {
      reset();
    }
  }, [value, validate, reset]);

  useEffect(() => {
    // Usar ref para evitar bucles por cambio de callback
    onValidationChangeRef.current(state === 'valid', metadata);
  }, [state, metadata]);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          URL del vídeo de Vimeo *
        </label>
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://vimeo.com/123456789"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Estado de validación */}
      {state === 'validating' && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Validant URL...
        </div>
      )}

      {state === 'error' && error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">❌ {error}</p>
        </div>
      )}

      {state === 'valid' && metadata && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
          <div className="flex items-start gap-3">
            {/* Thumbnail */}
            {metadata.thumbnail_url && (
              <Image
                src={metadata.thumbnail_url}
                alt="Video thumbnail"
                width={128}
                height={80}
                className="w-32 h-20 object-cover rounded"
              />
            )}
            
            {/* Metadata */}
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-green-800">
                ✅ Vídeo vàlid
              </p>
              {metadata.title && (
                <p className="text-sm text-gray-700">
                  <strong>Títol:</strong> {metadata.title}
                </p>
              )}
              {metadata.duration && (
                <p className="text-sm text-gray-600">
                  <strong>Durada:</strong> {Math.floor(metadata.duration / 60)}:{(metadata.duration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
