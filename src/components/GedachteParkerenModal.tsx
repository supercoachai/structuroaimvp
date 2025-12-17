"use client";

import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface GedachteParkerenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPark: (text: string) => Promise<void>;
}

export default function GedachteParkerenModal({ isOpen, onClose, onPark }: GedachteParkerenModalProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onPark(text.trim());
      setText('');
      onClose();
    } catch (error) {
      console.error('Error parking thought:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setText('');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">🧠 Gedachte parkeren</h2>
            <p className="text-sm text-gray-600 mt-1">Schrijf kort op wat je nu afleidt.</p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Sluiten"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Bijvoorbeeld: 'Moet nog boodschappen doen' of 'Bel mama terug'..."
          maxLength={240}
          rows={4}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
          style={{ fontSize: '14px', lineHeight: '1.5' }}
          autoFocus
        />
        
        {/* Character count */}
        <div className="text-xs text-gray-500 text-right mt-1 mb-4">
          {text.length} / 240 tekens
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Parkeren...' : 'Parkeren'}
          </button>
        </div>
      </div>
    </div>
  );
}

