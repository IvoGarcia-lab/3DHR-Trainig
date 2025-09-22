import React, { useRef, useState, useEffect, useCallback } from 'react';
// Fix: Import NodeType to resolve the 'Cannot find name' error.
import { NodeData, Edge, NodeType, CombineInputConfig, BlendMode } from '../types';
import {
  BeakerIcon, CameraIcon, CloseIcon, CogIcon, CubeIcon, MagicWandIcon, PlayIcon, SparklesIcon, UploadIcon, PaintBrushIcon, TextIcon, BookOpenIcon
} from './icons';
// Fix: Import getConnectorPosition to resolve reference error.
import { getConnectorPosition } from '../utils';

interface NodeComponentProps {
  node: NodeData;
  nodes: NodeData[]; // Pass all nodes to find source node info for combine UI
  edges: Edge[];
  snapTarget: { nodeId: string; connectorId: string | number } | null;
  onMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onTouchStart: (e: React.TouchEvent, nodeId: string) => void;
  onConnectorMouseDown: (e: React.MouseEvent, nodeId: string, connectorId: string | number) => void;
  onConnectorTouchStart: (e: React.TouchEvent, nodeId: string, connectorId: string | number) => void;
  onDisconnectAndReconnect: (e: React.MouseEvent | React.TouchEvent, nodeId: string, connectorId: string | number) => void;
  onUpdateNode: (nodeId: string, data: Partial<NodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onRunNode: (nodeId: string) => void;
  onOpenImageEditor: (nodeId: string) => void;
  onOpenSceneSettings: (nodeId: string) => void;
  onViewImage: (imageUrl: string, nodeLabel: string) => void;
  onSuggestPrompts: (nodeId: string) => void;
  onSuggestTextVariations: (nodeId: string) => void;
  onNodeResizeStart: (e: React.MouseEvent, nodeId: string) => void;
}

const nodeTypeIcons: { [key in NodeType]: React.FC<React.SVGProps<SVGSVGElement>> } = {
    INPUT: CameraIcon,
    TEXT_INPUT: TextIcon,
    COMBINE: MagicWandIcon,
    ANALYZE: BeakerIcon,
    SCENE: CubeIcon,
    STYLE_EXTRACTOR: PaintBrushIcon,
    DETAIL: SparklesIcon,
    ENHANCE_PROMPT: BookOpenIcon,
};

const NodeComponent: React.FC<NodeComponentProps> = ({
  node, nodes, edges, snapTarget, onMouseDown, onTouchStart, onConnectorMouseDown, onConnectorTouchStart, onDisconnectAndReconnect, onUpdateNode, onDeleteNode, onRunNode, onOpenImageEditor, onOpenSceneSettings, onViewImage, onSuggestPrompts, onSuggestTextVariations, onNodeResizeStart
}) => {

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs and state for Detail Node canvas masking
  const detailImageRef = useRef<HTMLImageElement>(null);
  const detailCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.type === 'image/gif') {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (!event.target?.result) return;
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, img.width, img.height);
            try {
              const pngDataUrl = canvas.toDataURL('image/png');
              onUpdateNode(node.id, {
                image: { src: pngDataUrl, mimeType: 'image/png' },
                label: file.name.split('.')[0],
                errorMessage: undefined
              });
            } catch (err) {
              onUpdateNode(node.id, { errorMessage: 'Falha ao converter GIF.' });
              setTimeout(() => onUpdateNode(node.id, { errorMessage: undefined }), 5000);
            }
          };
          img.onerror = () => {
            onUpdateNode(node.id, { errorMessage: 'Não foi possível carregar o GIF para conversão.' });
            setTimeout(() => onUpdateNode(node.id, { errorMessage: undefined }), 5000);
          };
          img.src = event.target.result as string;
        };
        reader.readAsDataURL(file);
      } else {
          const supportedApiTypes = ['image/jpeg', 'image/png', 'image/webp'];
          if (supportedApiTypes.includes(file.type)) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result) {
                onUpdateNode(node.id, {
                  image: { src: reader.result as string, mimeType: file.type },
                  label: file.name.split('.')[0],
                  errorMessage: undefined
                });
              }
            };
            reader.readAsDataURL(file);
          } else {
            onUpdateNode(node.id, { errorMessage: `Tipo não suportado. Use PNG, JPG, WEBP, GIF.` });
            setTimeout(() => onUpdateNode(node.id, { errorMessage: undefined }), 5000);
          }
      }
    }
    // Fix: Reset input value to allow re-uploading the same file, ensuring onChange always fires.
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };


  const nodeImage = node.output?.image || node.image;

  const getConnectorElements = () => {
    let inputs: (string | number)[] = [];
    let outputs: (string | number)[] = [];

    switch (node.type) {
      case 'INPUT':
        outputs = [0];
        break;
      case 'TEXT_INPUT':
        outputs.push('text');
        if (node.output?.image) {
            outputs.push(0); // Add image output if it exists
        }
        break;
      case 'COMBINE':
        const connectedInputs = edges.filter(e => e.toNode === node.id && typeof e.toConnector === 'number').length;
        inputs = [...Array(connectedInputs + 1).keys(), 'prompt'];
        outputs = [0];
        break;
      case 'ANALYZE':
        inputs = [0];
        outputs = ['text', 0];
        break;
      case 'STYLE_EXTRACTOR':
        inputs = [0];
        outputs = ['text'];
        break;
      case 'SCENE':
        const connectedSceneInputs = edges.filter(e => e.toNode === node.id).length;
        inputs = [...Array(connectedSceneInputs + 1).keys()];
        outputs = [0];
        break;
      case 'DETAIL':
        inputs = [0];
        outputs = [0];
        break;
      case 'ENHANCE_PROMPT':
        inputs = ['text'];
        outputs = ['text'];
        break;
    }
    
    const imageInputs = inputs.filter(id => typeof id === 'number');
    const textInput = inputs.find(id => id === 'prompt' || id === 'text');

    return { imageInputs, textInput: textInput as ('prompt' | 'text' | undefined), outputs };
  };

  const { imageInputs, textInput, outputs } = getConnectorElements();
  
  const hasImageInputs = edges.some(e => e.toNode === node.id && typeof e.toConnector === 'number');

  // --- MASK DRAWING LOGIC FOR DETAIL NODE ---
  const getInputImageForDetail = useCallback(() => {
    const imageEdge = edges.find(e => e.toNode === node.id && e.toConnector === 0);
    const sourceNode = imageEdge ? nodes.find(n => n.id === imageEdge.fromNode) : undefined;
    return sourceNode?.output?.image || sourceNode?.image;
  }, [node.id, edges, nodes]);

  const getCanvasContext = useCallback(() => {
    const canvas = detailCanvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  }, []);

  useEffect(() => {
    if (node.type === 'DETAIL' && node.isMasking) {
      const image = detailImageRef.current;
      const canvas = detailCanvasRef.current;
      const inputImage = getInputImageForDetail();
      
      const setupCanvas = () => {
        if (canvas && image && image.naturalWidth > 0) {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = getCanvasContext();
            if (ctx) {
                // If there's an existing mask, draw it. Otherwise, clear.
                if (node.mask?.src) {
                    const maskImg = new Image();
                    maskImg.onload = () => {
                        ctx.drawImage(maskImg, 0, 0);
                    }
                    maskImg.src = node.mask.src;
                } else {
                    ctx.fillStyle = 'black';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            }
        }
      }

      if(inputImage && image) {
        if (image.complete) {
          setupCanvas();
        } else {
          image.addEventListener('load', setupCanvas);
          return () => image.removeEventListener('load', setupCanvas);
        }
      }
    }
  }, [node.type, node.isMasking, node.mask, getInputImageForDetail, getCanvasContext]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement>): { x: number, y: number } | null => {
    const canvas = detailCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true);
    const ctx = getCanvasContext();
    if(ctx) {
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
    }
    draw(e);
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (isDrawing && detailCanvasRef.current) {
        onUpdateNode(node.id, { mask: { src: detailCanvasRef.current.toDataURL('image/png'), mimeType: 'image/png' }});
    }
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!isDrawing) return;
    const ctx = getCanvasContext();
    const coords = getCoords(e);
    if (!ctx || !coords) return;

    ctx.lineWidth = node.brushSize || 40;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const handleClearMask = () => {
      const ctx = getCanvasContext();
      const canvas = detailCanvasRef.current;
      if(ctx && canvas) {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          onUpdateNode(node.id, { mask: { src: canvas.toDataURL('image/png'), mimeType: 'image/png' }});
      }
  }
  // --- END OF MASKING LOGIC ---


  const renderNodeContent = () => {
    switch (node.type) {
      case 'INPUT':
        return (
          <div className="p-2 flex-grow flex items-center justify-center min-h-0">
            {/* O input está sempre presente, mas escondido, para que a ref esteja sempre disponível */}
            <input ref={fileInputRef} type="file" onChange={handleImageUpload} className="hidden" accept="image/png,image/jpeg,image/webp,image/gif" />
            
            {node.image ? (
              <div 
                className="relative group w-full h-full cursor-pointer"
                onDoubleClick={() => fileInputRef.current?.click()}
                title="Clique duplo para trocar a imagem"
              >
                <img src={node.image.src} alt={node.label} className="object-contain w-full h-full rounded-md" />
              </div>
            ) : (
              <label
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-full border-2 border-dashed border-gray-600 rounded-md flex flex-col items-center justify-center text-gray-400 hover:bg-gray-700 hover:border-gray-500 transition-colors cursor-pointer"
              >
                <UploadIcon className="w-8 h-8 mb-2" />
                <span>Carregar Imagem</span>
              </label>
            )}
          </div>
        );
      case 'TEXT_INPUT':
        return (
            <div className="p-2 flex-grow flex flex-col min-h-0">
                <div className="flex-shrink-0">
                    <textarea
                    value={node.prompt || ''}
                    onChange={(e) => onUpdateNode(node.id, { prompt: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    placeholder="Escreva o seu texto aqui..."
                    className="w-full p-2 bg-gray-900/50 rounded-md placeholder-gray-400 text-sm resize-none mb-2 h-24"
                    />
                    <button 
                        onMouseDown={(e) => { e.stopPropagation(); onSuggestTextVariations(node.id); }}
                        onTouchStart={(e) => e.stopPropagation()}
                        disabled={!node.prompt || node.prompt.trim() === '' || node.isProcessing}
                        className="w-full flex-shrink-0 flex items-center justify-center gap-2 p-2 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold text-sm transition-colors disabled:bg-purple-800/50 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Sugestões Avançadas
                    </button>
                </div>
                <div 
                    className="flex-grow bg-gray-900/50 rounded-md flex items-center justify-center relative group min-h-0 mt-2"
                    onDoubleClick={() => node.output?.image && onViewImage(node.output.image.src, node.label)}
                    >
                    {node.output?.image ? (
                        <img src={node.output.image.src} alt="Output" className="object-contain w-full h-full rounded-md" />
                    ) : (
                        <span className="text-gray-500 text-sm px-4 text-center">A imagem gerada aparecerá aqui</span>
                    )}
                </div>
            </div>
        );
      case 'COMBINE':
        const imageEdges = edges.filter(e => e.toNode === node.id && typeof e.toConnector === 'number');
        const orderedConfigs = (node.combineInputsConfig || []).slice();

        const handleUpdateConfig = (edgeId: string, newConfig: Partial<CombineInputConfig>) => {
            const newConfigs = (node.combineInputsConfig || []).map(c => c.edgeId === edgeId ? { ...c, ...newConfig } : c);
            onUpdateNode(node.id, { combineInputsConfig: newConfigs });
        };
        
        const handleMove = (index: number, direction: 'up' | 'down') => {
            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= orderedConfigs.length) return;
            const newConfigs = [...orderedConfigs];
            const temp = newConfigs[index];
            newConfigs[index] = newConfigs[newIndex];
            newConfigs[newIndex] = temp;
            onUpdateNode(node.id, { combineInputsConfig: newConfigs });
        };

        const blendModeIcons: {[key in BlendMode]: string} = { ADD: '+', SUBTRACT: '-', REFERENCE: 'Ref', COMPOSE: '&', OFF: 'Off' };
        const blendModeLabels: {[key in BlendMode]: string} = { 
            ADD: 'Fusão Conceptual: Funde os assuntos desta imagem.', 
            SUBTRACT: 'Guia Negativo: Evita os assuntos/estilos desta imagem.', 
            REFERENCE: 'Transferência de Estilo: Usa apenas como referência de estilo/arte.',
            COMPOSE: 'Composição de Cena: Coloca os objetos numa cena coesa. A ordem importa.',
            OFF: 'Desligado: Usa a imagem como uma entrada padrão, sem diretivas complexas.'
        };
        const blendModeCycle: BlendMode[] = ['ADD', 'COMPOSE', 'SUBTRACT', 'REFERENCE', 'OFF'];

        return (
          <div className="p-2 flex-grow flex flex-col min-h-0 text-sm">
            <div className="flex-shrink-0 mb-2">
                {node.promptSourceNodeIds && node.promptSourceNodeIds.length > 0 && 
                    <p className="text-xs text-gray-400 mb-1 italic">O texto abaixo será combinado com as entradas de texto conectadas.</p>
                }
                <textarea
                  value={node.prompt || ''}
                  onChange={(e) => onUpdateNode(node.id, { prompt: e.target.value })}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  placeholder="Adicione instruções adicionais aqui..."
                  className="w-full p-2 bg-gray-700 rounded-md placeholder-gray-400 text-sm h-16 resize-none"
                />
                <button 
                    onMouseDown={(e) => { e.stopPropagation(); onSuggestPrompts(node.id); }}
                    onTouchStart={(e) => e.stopPropagation()}
                    disabled={!hasImageInputs || node.isProcessing}
                    className="w-full mt-1 flex items-center justify-center gap-2 p-2 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold text-sm transition-colors disabled:bg-purple-800/50 disabled:cursor-not-allowed"
                >
                    <SparklesIcon className="w-4 h-4" />
                    Sugerir Instruções
                </button>
            </div>

            <div className="flex-shrink-0 border-t border-b border-gray-700 py-2 my-2">
                <h4 className="text-sm font-semibold px-1 mb-1 text-gray-300">Entradas de Imagem</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto px-1">
                    {orderedConfigs.map((config, index) => {
                        const edge = imageEdges.find(e => e.id === config.edgeId);
                        if (!edge) return null;
                        const sourceNode = nodes.find(n => n.id === edge.fromNode);
                        const sourceImage = sourceNode?.output?.image || sourceNode?.image;

                        return (
                            <div key={config.edgeId} className="flex items-center gap-2 p-1.5 bg-gray-900/50 rounded-md">
                                {sourceImage ? <img src={sourceImage.src} className="w-8 h-8 object-cover rounded-sm flex-shrink-0" /> : <div className="w-8 h-8 bg-gray-700 rounded-sm flex-shrink-0"/>}
                                <div className="flex-grow">
                                    <div className="text-xs text-gray-300 truncate">{sourceNode?.label}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">{Math.round(config.influence * 100)}%</span>
                                        <input type="range" min="0" max="1" step="0.05" value={config.influence} 
                                            onMouseDown={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()}
                                            onChange={e => handleUpdateConfig(config.edgeId, { influence: parseFloat(e.target.value)})}
                                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500 flex-grow"
                                        />
                                    </div>
                                </div>
                                <button
                                    title={blendModeLabels[config.blendMode]}
                                    onClick={() => {
                                        const currentIndex = blendModeCycle.indexOf(config.blendMode);
                                        const nextIndex = (currentIndex + 1) % blendModeCycle.length;
                                        handleUpdateConfig(config.edgeId, { blendMode: blendModeCycle[nextIndex] });
                                    }}
                                    className="p-1 w-8 h-8 flex-shrink-0 bg-gray-700 hover:bg-gray-600 rounded-md font-mono font-bold text-xs"
                                >{blendModeIcons[config.blendMode]}</button>
                                <div className="flex flex-col gap-0.5">
                                    <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="disabled:opacity-20 hover:bg-gray-600 rounded-sm p-0.5 leading-none">▲</button>
                                    <button onClick={() => handleMove(index, 'down')} disabled={index === orderedConfigs.length - 1} className="disabled:opacity-20 hover:bg-gray-600 rounded-sm p-0.5 leading-none">▼</button>
                                </div>
                            </div>
                        )
                    })}
                    {orderedConfigs.length === 0 && <p className="text-xs text-gray-500 text-center py-2">Conecte uma imagem de entrada.</p>}
                </div>
            </div>

            <div 
              className="flex-grow bg-gray-900/50 rounded-md flex items-center justify-center relative group min-h-0"
              onDoubleClick={() => nodeImage && onViewImage(nodeImage.src, node.label)}
            >
              {nodeImage ? (
                 <>
                    <img src={nodeImage.src} alt="Output" className="object-contain w-full h-full rounded-md" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onMouseDown={(e) => { e.stopPropagation(); onOpenImageEditor(node.id); }}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="p-2 bg-gray-700/80 backdrop-blur-sm rounded-full text-white hover:bg-purple-600"
                            title="Refinar Imagem"
                        >
                            <SparklesIcon className="w-5 h-5" />
                        </button>
                    </div>
                 </>
              ) : (
                <span className="text-gray-500 text-sm px-4 text-center">O resultado aparecerá aqui</span>
              )}
            </div>
          </div>
        );
      case 'SCENE':
        return (
          <div className="p-2 flex-grow flex flex-col min-h-0">
            <div 
              className="flex-grow bg-gray-900/50 rounded-md flex items-center justify-center relative group min-h-0"
              onDoubleClick={() => nodeImage && onViewImage(nodeImage.src, node.label)}
            >
              {nodeImage ? (
                 <img src={nodeImage.src} alt="Output" className="object-contain w-full h-full rounded-md" />
              ) : (
                <span className="text-gray-500 text-sm px-4 text-center">O resultado aparecerá aqui</span>
              )}
            </div>
          </div>
        );
      case 'ANALYZE': {
        const imageEdge = edges.find(e => e.toNode === node.id && e.toConnector === 0);
        const sourceNode = imageEdge ? nodes.find(n => n.id === imageEdge.fromNode) : undefined;
        const inputImage = sourceNode?.output?.image || sourceNode?.image;
        const imageToDisplay = node.output?.image || inputImage;

        return (
          <div className="p-2 flex-grow flex flex-col min-h-0 gap-2">
            {/* Image section: takes up more space to make the image 'prominent' */}
            <div className="flex-[2_2_0%] min-h-0 flex flex-col">
              {imageToDisplay && (
                <p className="flex-shrink-0 text-xs text-center text-gray-400 mb-1">Entrada de Imagem Analisada</p>
              )}
              <div
                className="flex-grow bg-gray-900/50 rounded-md flex items-center justify-center relative group min-h-0"
                onDoubleClick={() => imageToDisplay && onViewImage(imageToDisplay.src, node.label)}
                title={imageToDisplay ? "Clique duplo para visualizar" : ""}
              >
                {imageToDisplay ? (
                  <img src={imageToDisplay.src} alt="Imagem Analisada" className="object-contain w-full h-full rounded-md" />
                ) : (
                  <span className="text-gray-500 text-xs text-center px-2">Conecte uma imagem de entrada e execute para analisar.</span>
                )}
              </div>
              {node.isProcessing && (
                  <p className="flex-shrink-0 text-xs text-center text-purple-400 mt-1 animate-pulse">A analisar...</p>
              )}
            </div>
            {/* Text output section */}
            <div className="flex-1 min-h-0 bg-gray-900/50 rounded-md p-2 overflow-y-auto text-sm text-gray-300">
              {node.output?.text ? (
                <p className="whitespace-pre-wrap break-words">{node.output.text}</p>
              ) : (
                <span className="text-gray-500">A análise aparecerá aqui</span>
              )}
            </div>
          </div>
        );
      }
      case 'STYLE_EXTRACTOR':
        return (
          <div className="p-2 flex-grow flex flex-col min-h-0">
            <div className="flex-grow bg-gray-900/50 rounded-md p-2 overflow-y-auto text-sm text-gray-300 min-h-0">
              {node.output?.text ? (
                <p className="whitespace-pre-wrap break-words">{node.output.text}</p>
              ) : (
                <span className="text-gray-500">A descrição de estilo aparecerá aqui</span>
              )}
            </div>
            {node.type === 'STYLE_EXTRACTOR' && (
                <div className="flex-shrink-0 pt-3 px-1">
                    <label htmlFor={`intensity-${node.id}`} className="block text-xs font-medium text-gray-400 mb-1">
                        Influência do Estilo: {Math.round((node.styleIntensity ?? 1) * 100)}%
                    </label>
                    <input
                        id={`intensity-${node.id}`}
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={node.styleIntensity ?? 1}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateNode(node.id, { styleIntensity: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            )}
          </div>
        );
      case 'DETAIL': {
        const inputImage = getInputImageForDetail();
        const imageToDisplay = node.output?.image || inputImage;

        return (
            <div className="p-2 flex-grow flex flex-col min-h-0 gap-2">
                <div 
                    className="flex-grow bg-black border border-gray-700 rounded-md flex items-center justify-center relative group min-h-0"
                    onDoubleClick={() => imageToDisplay && !node.isMasking && onViewImage(imageToDisplay.src, node.label)}
                >
                    {inputImage && (
                      <img 
                        ref={detailImageRef} 
                        src={inputImage.src} 
                        alt="Imagem de Entrada" 
                        className={`object-contain w-full h-full rounded-md transition-opacity duration-300 ${node.isMasking ? 'opacity-100' : 'opacity-0'}`} 
                        style={{pointerEvents: 'none'}}
                      />
                    )}

                    {imageToDisplay && (
                      <img 
                        src={imageToDisplay.src} 
                        alt="Resultado" 
                        className={`absolute inset-0 object-contain w-full h-full rounded-md transition-opacity duration-300 ${node.isMasking ? 'opacity-0' : 'opacity-100'}`}
                      />
                    )}
                    
                    {node.isMasking && inputImage && (
                        <canvas 
                            ref={detailCanvasRef}
                            className="absolute inset-0 w-full h-full object-contain cursor-crosshair opacity-50"
                            onMouseDown={startDrawing}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onMouseMove={draw}
                        />
                    )}

                    {!inputImage && !node.output?.image && (
                        <span className="text-gray-500 text-sm px-4 text-center">Conecte uma imagem de entrada.</span>
                    )}
                </div>
                <div className="flex-shrink-0 flex flex-col gap-2">
                    <div className={`p-2 rounded-md bg-gray-700/50 transition-all ${node.isMasking ? 'h-24' : 'h-0 overflow-hidden p-0 border-0'}`}>
                       <div className="flex gap-4 h-full">
                           <div className="flex-grow">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Tamanho do Pincel: {node.brushSize ?? 40}px</label>
                                <input
                                    type="range"
                                    min="10"
                                    max="150"
                                    step="5"
                                    value={node.brushSize ?? 40}
                                    onChange={(e) => onUpdateNode(node.id, { brushSize: Number(e.target.value)})}
                                    className="w-full h-2 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                           </div>
                           <button onClick={handleClearMask} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 font-semibold rounded-md text-sm self-end">Limpar Máscara</button>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onUpdateNode(node.id, {isMasking: !node.isMasking})}
                            className={`w-full p-2 rounded-md text-sm font-semibold transition-colors ${node.isMasking ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-600 hover:bg-gray-500'}`}
                        >
                            {node.isMasking ? 'Concluir Pintura' : 'Pintar Máscara'}
                        </button>
                    </div>
                    <textarea
                    value={node.prompt || ''}
                    onChange={(e) => onUpdateNode(node.id, { prompt: e.target.value })}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    placeholder="Instruções de refinamento..."
                    className="w-full p-2 bg-gray-700 rounded-md placeholder-gray-400 text-sm h-20 resize-none"
                    />
                </div>
            </div>
        );
      }
      case 'ENHANCE_PROMPT':
        return (
          <div className="p-2 flex-grow flex flex-col min-h-0 gap-2">
            <textarea
              value={node.prompt || ''}
              onChange={(e) => onUpdateNode(node.id, { prompt: e.target.value })}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              placeholder="Instrução de refinamento... (ex: torná-lo mais cinematográfico)"
              className="w-full p-2 bg-gray-900/50 rounded-md placeholder-gray-400 text-sm resize-none h-16 flex-shrink-0"
            />
            <div className="flex-grow bg-gray-900/50 rounded-md p-2 overflow-y-auto text-sm text-gray-300 min-h-0">
              {node.output?.text ? (
                <p className="whitespace-pre-wrap break-words">{node.output.text}</p>
              ) : (
                <span className="text-gray-500">O texto refinado aparecerá aqui. Conecte uma entrada de texto e execute.</span>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  
  const Icon = nodeTypeIcons[node.type];

  const borderClass = node.selected 
    ? 'border-purple-500 shadow-lg shadow-purple-500/30' 
    : node.isProcessing ? 'border-purple-500 animate-pulse-border' : 'border-gray-700';

  return (
    <div
      data-is-node="true"
      className={`absolute bg-gray-800 border-2 ${borderClass} rounded-lg shadow-xl flex flex-col select-none transition-all duration-150`}
      style={{ left: node.position.x, top: node.position.y, width: node.width, height: node.height, zIndex: node.zIndex }}
      onMouseDown={(e) => onMouseDown(e, node.id)}
      onTouchStart={(e) => onTouchStart(e, node.id)}
    >
      <div className="bg-gray-900/70 p-2 rounded-t-lg cursor-move flex justify-between items-center flex-shrink-0 h-11">
        <div className="flex items-center gap-2 text-white font-bold flex-grow min-w-0">
            <Icon className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <input 
              type="text" 
              value={node.label} 
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onChange={(e) => onUpdateNode(node.id, {label: e.target.value})}
              className="bg-transparent focus:bg-gray-700 rounded p-1 outline-none w-full truncate"
              title={node.label}
            />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 pl-2">
             {node.type === 'SCENE' && 
                <button onMouseDown={(e) => { e.stopPropagation(); onOpenSceneSettings(node.id)}} onTouchStart={(e) => e.stopPropagation()} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"><CogIcon className="w-5 h-5" /></button>
             }
            {(node.type === 'COMBINE' || node.type === 'ANALYZE' || node.type === 'SCENE' || node.type === 'STYLE_EXTRACTOR' || node.type === 'TEXT_INPUT' || node.type === 'DETAIL' || node.type === 'ENHANCE_PROMPT') && 
                <button onMouseDown={(e) => { e.stopPropagation(); onRunNode(node.id); }} onTouchStart={(e) => e.stopPropagation()} disabled={node.isProcessing || (node.type === 'TEXT_INPUT' && (!node.prompt || node.prompt.trim() === ''))} className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed p-1 rounded-full hover:bg-gray-700 transition-colors"><PlayIcon className="w-5 h-5" /></button>
            }
             <button onMouseDown={(e) => { e.stopPropagation(); onDeleteNode(node.id)}} onTouchStart={(e) => e.stopPropagation()} className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-gray-700 transition-colors"><CloseIcon className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-grow relative min-h-0 overflow-hidden">
        {renderNodeContent()}
      </div>

      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity z-10"
        onMouseDown={(e) => onNodeResizeStart(e, node.id)}
      >
        <svg viewBox="0 0 10 10" fill="currentColor" className="text-gray-400">
            <path d="M 0 10 L 10 0 L 10 2 L 2 10 Z" />
            <path d="M 4 10 L 10 4 L 10 6 L 6 10 Z" />
            <path d="M 8 10 L 10 8 L 10 10 Z" />
        </svg>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        {imageInputs.map((connectorId) => {
           const pos = getConnectorPosition(node, connectorId, 'in', edges);
           const isSnapped = snapTarget?.nodeId === node.id && snapTarget?.connectorId === connectorId;
           const isConnected = edges.some(e => e.toNode === node.id && e.toConnector === connectorId);
           
           let connectorClasses = 'absolute w-5 h-5 border-2 border-gray-800 rounded-full transition-all duration-150 pointer-events-auto ';
           let title = "Entrada: Imagem";

           if (isConnected) {
               connectorClasses += 'bg-green-600 cursor-pointer hover:bg-red-500';
               title = "Arrastar para reconectar";
           } else if (isSnapped) {
               connectorClasses += 'bg-green-500 scale-125 shadow-lg shadow-green-500/50 cursor-crosshair';
           } else {
               connectorClasses += 'bg-gray-600 hover:bg-purple-500 cursor-crosshair';
           }

           return (
            <div
              key={`in-${connectorId}`}
              className={connectorClasses}
              style={{ left: pos.x - node.position.x, top: pos.y - node.position.y, transform: 'translate(-50%, -50%)' }}
              title={title}
              onMouseDown={(e) => { 
                e.stopPropagation(); 
                if (isConnected) {
                    onDisconnectAndReconnect(e, node.id, connectorId);
                }
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                if (isConnected) {
                    onDisconnectAndReconnect(e, node.id, connectorId);
                }
              }}
            />
           )
        })}
        {textInput && (() => {
            const connectorId = textInput;
            const isSnapped = snapTarget?.nodeId === node.id && snapTarget?.connectorId === connectorId;
            const isConnected = edges.some(e => e.toNode === node.id && e.toConnector === connectorId);
            
            let connectorClasses = 'absolute w-5 h-5 border-2 border-gray-800 rounded-full transition-all duration-150 pointer-events-auto ';
            let title = "Entrada: Instrução";
            
            if (isConnected) {
                connectorClasses += 'bg-green-600 cursor-pointer hover:bg-red-500';
                title = "Arrastar para reconectar";
            } else if (isSnapped) {
                connectorClasses += 'bg-green-500 scale-125 shadow-lg shadow-green-500/50 cursor-crosshair';
            } else {
                connectorClasses += 'bg-yellow-600 hover:bg-yellow-400 cursor-crosshair';
            }
            
            return (
                <div
                    key={`in-${connectorId}`}
                    className={connectorClasses}
                    style={{ left: '50%', transform: 'translateX(-50%)', top: '-10px' }}
                    title={title}
                    onMouseDown={(e) => { 
                        e.stopPropagation(); 
                        if (isConnected) {
                            onDisconnectAndReconnect(e, node.id, connectorId);
                        }
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        if (isConnected) {
                            onDisconnectAndReconnect(e, node.id, connectorId);
                        }
                    }}
                />
            )
        })()}
        {outputs.map((connectorId, index) => {
          const pos = getConnectorPosition(node, connectorId, 'out', edges, index, outputs.length);
          const isText = connectorId === 'text';
          const bgColor = isText ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-gray-500 hover:bg-green-500';
          const title = isText ? 'Saída: Texto' : 'Saída: Imagem';

          return (
            <div
              key={`out-${connectorId}`}
              className={`absolute w-5 h-5 ${bgColor} border-2 border-gray-800 rounded-full cursor-crosshair transition-colors pointer-events-auto`}
              style={{ left: pos.x - node.position.x, top: pos.y - node.position.y, transform: 'translate(-50%, -50%)' }}
              onMouseDown={(e) => { e.stopPropagation(); onConnectorMouseDown(e, node.id, connectorId); }}
              onTouchStart={(e) => { e.stopPropagation(); onConnectorTouchStart(e, node.id, connectorId); }}
              title={title}
            />
          );
        })}
      </div>

      {node.errorMessage && (
          <div className="absolute bottom-0 left-0 right-0 bg-red-800/80 text-white text-xs p-2 rounded-b-lg backdrop-blur-sm">
              {node.errorMessage}
          </div>
      )}
       {node.isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg pointer-events-auto">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
      )}
    </div>
  );
};

export default NodeComponent;