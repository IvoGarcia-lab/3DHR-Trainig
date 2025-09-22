// Fix: Provide full implementation for ImageViewerModal component.
import React from 'react';
import { CloseIcon } from './icons';

interface ImageViewerModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  onClose: () => void;
  nodeLabel: string;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, imageUrl, onClose, nodeLabel }) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800 text-white p-4 rounded-lg shadow-2xl max-w-[90vw] max-h-[90vh] border border-gray-700 relative flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-600">
            <h2 className="text-xl font-bold">Visualizador de Imagem - <span className="text-purple-400">{nodeLabel}</span></h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
        
        <div className="flex-grow flex items-center justify-center">
            <img src={imageUrl} alt="Full size view" className="max-w-full max-h-[75vh] object-contain rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default ImageViewerModal;