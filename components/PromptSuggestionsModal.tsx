import React from 'react';
import { CloseIcon, SparklesIcon } from './icons';

interface PromptSuggestionsModalProps {
  isOpen: boolean;
  title: string;
  suggestions: string[];
  onClose: () => void;
  onSelect: (prompt: string) => void;
}

const PromptSuggestionsModal: React.FC<PromptSuggestionsModalProps> = ({ isOpen, title, suggestions, onClose, onSelect }) => {
  if (!isOpen) return null;

  const handleSelect = (prompt: string) => {
    onSelect(prompt);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700 relative flex flex-col">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <CloseIcon className="w-6 h-6" />
        </button>
        
        <div className="flex items-center mb-4">
          <SparklesIcon className="w-6 h-6 mr-3 text-purple-400" />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>
        
        <div className="space-y-3">
            {suggestions.map((prompt, index) => (
                <button
                    key={index}
                    onClick={() => handleSelect(prompt)}
                    className="w-full text-left p-4 bg-gray-700 hover:bg-purple-600 rounded-md transition-colors text-gray-200"
                >
                    "{prompt}"
                </button>
            ))}
            {suggestions.length === 0 && (
                <p className="text-gray-400 text-center py-4">Nenhuma sugestão foi gerada. Tente novamente ou ajuste o seu texto.</p>
            )}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromptSuggestionsModal;