import React from 'react';
import { NodeType, Point } from '../types';
import { BeakerIcon, CameraIcon, CubeIcon, MagicWandIcon, PaintBrushIcon, SparklesIcon, TextIcon, BookOpenIcon } from './icons';

interface AddNodeContextMenuProps {
  position: Point;
  onSelect: (type: NodeType) => void;
  onClose: () => void;
}

const nodeOptions: { type: NodeType; label: string; icon: React.FC<any> }[] = [
    { type: 'INPUT', label: 'Nó de Entrada', icon: CameraIcon },
    { type: 'TEXT_INPUT', label: 'Nó de Texto', icon: TextIcon },
    { type: 'ENHANCE_PROMPT', label: 'Refinador de Texto', icon: BookOpenIcon },
    { type: 'COMBINE', label: 'Nó de Combinação', icon: MagicWandIcon },
    { type: 'ANALYZE', label: 'Nó de Análise', icon: BeakerIcon },
    { type: 'STYLE_EXTRACTOR', label: 'Extrair Estilo', icon: PaintBrushIcon },
    { type: 'DETAIL', label: 'Nó de Detalhe', icon: SparklesIcon },
    { type: 'SCENE', label: 'Nó de Cena', icon: CubeIcon },
];


const AddNodeContextMenu: React.FC<AddNodeContextMenuProps> = ({ position, onSelect, onClose }) => {
    
  const handleSelect = (type: NodeType) => {
    onSelect(type);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose} // Close when clicking outside
      onContextMenu={(e) => { e.preventDefault(); onClose(); }} // Close on another right-click
    >
        <div
          className="absolute bg-gray-800 border border-gray-600 rounded-md shadow-lg p-2 z-50 w-52"
          style={{ top: position.y, left: position.x }}
          onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
        >
          <p className="text-xs text-gray-400 px-2 py-1 font-semibold uppercase">Adicionar Nó</p>
          <ul className="text-white">
            {nodeOptions.map(({ type, label, icon: Icon }) => (
              <li key={type}>
                <button
                  onClick={() => handleSelect(type)}
                  className="w-full text-left px-2 py-2 text-sm hover:bg-purple-600 rounded-md flex items-center gap-3 transition-colors"
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
};

export default AddNodeContextMenu;