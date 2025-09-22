// Implemented the full content of the Image Editor Modal component.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeData } from '../types';
import { CloseIcon, SparklesIcon } from './icons';

interface ImageEditorModalProps {
  isOpen: boolean;
  node: NodeData | null;
  onClose: () => void;
  onSubmit: (nodeId: string, prompt: string, image: { src: string, mimeType: string }, mask: { src: string, mimeType: string }) => Promise<void>;
  isProcessing: boolean;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, node, onClose, onSubmit, isProcessing }) => {
  const [prompt, setPrompt] = useState('');
  const [brushSize, setBrushSize] = useState(40);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const imageToEdit = node?.output?.image || node?.image;

  const getCanvasContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  useEffect(() => {
    if (isOpen && imageToEdit && imageRef.current) {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const onLoad = () => {
            if (canvas) {
                canvas.width = image.naturalWidth;
                canvas.height = image.naturalHeight;
                const ctx = getCanvasContext();
                if (ctx) {
                    ctx.fillStyle = 'black'; // Mask is black where we DON'T edit
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
        if (image.complete) {
            onLoad();
        } else {
            image.addEventListener('load', onLoad);
        }
        return () => {
            image.removeEventListener('load', onLoad);
        };
    }
  }, [isOpen, imageToEdit, getCanvasContext]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number, y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    draw(e); // Draw a point on click
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = getCanvasContext();
    if(ctx) {
        ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    const coords = getCoords(e);
    if (!ctx || !coords) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'white'; // Edit area is white

    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };
  
  const handleClear = () => {
      const ctx = getCanvasContext();
      const canvas = canvasRef.current;
      if(ctx && canvas) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
  }

  const handleSubmit = async () => {
    if (!node || !imageToEdit || !canvasRef.current) return;
    const mask = {
        src: canvasRef.current.toDataURL('image/png'),
        mimeType: 'image/png'
    };
    await onSubmit(node.id, prompt, imageToEdit, mask);
  };

  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-2xl w-full max-w-4xl border border-gray-700 relative flex flex-col max-h-[90vh]">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors" disabled={isProcessing}>
          <CloseIcon className="w-6 h-6" />
        </button>
        
        <div className="flex items-center mb-4">
          <SparklesIcon className="w-6 h-6 mr-3 text-purple-400" />
          <h2 className="text-2xl font-bold">Refinar Imagem</h2>
        </div>
        
        <div className="flex-grow flex gap-4 min-h-0">
            <div className="w-2/3 relative border border-gray-600 rounded-md overflow-hidden bg-black">
                {imageToEdit && (
                    <>
                        <img ref={imageRef} src={imageToEdit.src} alt="Editing subject" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                        <canvas 
                            ref={canvasRef}
                            className="absolute inset-0 w-full h-full object-contain cursor-crosshair opacity-50"
                            onMouseDown={startDrawing}
                            onMouseUp={stopDrawing}
                            onMouseOut={stopDrawing}
                            onMouseMove={draw}
                        />
                    </>
                )}
                 {isProcessing && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
                    </div>
                 )}
            </div>
            <div className="w-1/3 flex flex-col gap-4">
                <div className="bg-gray-700/50 p-4 rounded-md">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Instruções</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="ex: adicionar um chapéu de pirata"
                        className="w-full h-24 p-2 bg-gray-900 rounded-md placeholder-gray-500 resize-none"
                        disabled={isProcessing}
                    />
                </div>
                 <div className="bg-gray-700/50 p-4 rounded-md">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Tamanho do Pincel: {brushSize}px</label>
                     <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer"
                        disabled={isProcessing}
                    />
                </div>
                <button onClick={handleClear} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 font-semibold rounded-md transition-colors" disabled={isProcessing}>Limpar Máscara</button>
            </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-3 border-t border-gray-700 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 font-semibold rounded-md transition-colors" disabled={isProcessing}>
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 font-semibold rounded-md transition-colors flex items-center gap-2 disabled:bg-purple-800/50" disabled={!prompt || isProcessing}>
            <SparklesIcon className="w-5 h-5"/>
            {isProcessing ? 'A gerar...' : 'Aplicar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageEditorModal;