// Fix: Provide full implementation for Header component.
import React from 'react';
import { BookOpenIcon } from './icons';

interface HeaderProps {
    onOpenInspiration: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenInspiration }) => {
  return (
    <header className="bg-gray-900 text-white p-4 shadow-md border-b border-gray-700 z-20">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><path d="M12 22a10 10 0 0 0 10-10H2a10 10 0 0 0 10 10z"/><path d="m20.66 16-4-4 .01-4.01 4.01 4.01z"/><path d="m3.34 16 4-4 .01-4.01-4.01 4.01z"/><path d="M12 2a10 10 0 0 0-10 10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            <h1 className="text-xl font-bold">Tela de Visão Gemini</h1>
             <button 
                onClick={onOpenInspiration}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                title="Biblioteca de Inspiração de Prompts"
              >
                <BookOpenIcon className="w-5 h-5" />
            </button>
        </div>
        <div className="text-sm text-gray-400">
            Um Construtor Visual de Fluxos de Trabalho de IA Baseado em Nós
        </div>
      </div>
    </header>
  );
};

export default Header;