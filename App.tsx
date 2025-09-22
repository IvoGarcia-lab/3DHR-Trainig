import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NodeData, Edge, Point, NodeType, SceneSettings, NodeOutput, CombineInputConfig, BlendMode } from './types';
import { defaultNodes, defaultEdges } from './defaultLayout';
import * as geminiService from './services/geminiService';
import { getConnectorPosition, isPointInNode } from './utils';
import NodeComponent from './components/NodeComponent';
import EdgeComponent from './components/EdgeComponent';
import Header from './components/Header';
import AddNodeContextMenu from './components/AddNodeContextMenu';
import ImageViewerModal from './components/ImageViewerModal';
import ImageEditorModal from './components/ImageEditorModal';
import SceneSettingsModal from './components/SceneSettingsModal';
import PromptSuggestionsModal from './components/PromptSuggestionsModal';
import { BookOpenIcon, CloseIcon } from './components/icons';

// --- Inspiration Modal Component and Data ---
// The content from info.md has been structured here to be displayed in a modal.

const inspirationData = {
    intro: {
        title: "A Fórmula Definitiva para Prompts (6 Componentes)",
        paragraphs: [
            "A técnica principal apresentada para criar imagens de alta qualidade de forma consistente é uma fórmula de prompt com seis partes:",
            "SUJEITO + AÇÃO + AMBIENTE + ESTILO DE ARTE + ILUMINAÇÃO + DETALHES",
            "Aqui estão os exemplos práticos e os prompts detalhados que foram mostrados, aplicando a fórmula acima:"
        ],
    },
    sections: [
        {
            title: "Exemplo Básico (Incorreto vs. Correto)",
            content: [
                { type: 'text', value: '**Incorreto:** "Mulher no café"' },
                { type: 'prompt', value: "Uma jovem com sardas (sujeito) sorrindo pensativamente e sentada na praia (ação) em um café aconchegante perto da janela (ambiente). Foto tirada com uma Canon 5D Mark IV (estilo de arte), luz natural da janela (iluminação). Xícara de café quente nas mãos, fundo com foco suave (detalhes)." }
            ]
        },
        { title: "Prompt 1: Fotografia de Retrato Perfeita", content: [{ type: 'prompt', value: "Um executivo de negócios confiante com cabelo grisalho, fazendo contato visual direto com a câmera, em um escritório corporativo moderno com janelas do chão ao teto, foto tirada com uma lente de retrato de 85mm em filme de médio formato, iluminação de janela dramática criando efeito de luz de contorno, vestindo um terno azul-marinho sob medida com detalhes de textura sutis, profundidade de campo rasa isolando o sujeito." }] },
        { title: "Prompt 2: Magia da Fotografia de Produto", content: [{ type: 'prompt', value: "Um relógio suíço de luxo com caixa em ouro rosa e pulseira de couro preta, posicionado em um ângulo de três quartos mostrando o rosto e o perfil, sobre uma superfície de mármore branco com sombra suave, fotografia de estúdio com iluminação de softbox, foto tirada com lente macro para detalhes nítidos, fundo minimalista com gradiente sutil, superfícies reflexivas mostrando artesanato premium." }] },
        { title: "Prompt 3: Visualização Arquitetônica", content: [{ type: 'prompt', value: "Casa minimalista moderna com janelas de vidro do chão ao teto, posicionada em uma encosta com vista para o vale, capturada durante a hora dourada com luz quente refletindo nas superfícies de vidro, foto tirada com lente grande-angular de fotografia arquitetônica, céu dramático com nuvens dispersas, paisagem circundante com vegetação nativa, linhas limpas e formas geométricas enfatizadas." }] },
        { title: "Prompt 4: Maestria em Fotografia de Paisagem", content: [{ type: 'prompt', value: "Paisagem de montanha dramática com picos cobertos de neve refletindo em um lago alpino, capturada durante o nascer do sol com luz dourada e quente pintando as faces da montanha, foto tirada com lente grande-angular para capturar uma visão expansiva, rochas em primeiro plano fornecendo uma âncora composicional, nuvens dispersas adicionando textura ao céu, água cristalina mostrando reflexos perfeitos, sensação de natureza intocada." }] },
        { title: "Prompt 5: Autenticidade na Fotografia de Rua", content: [{ type: 'prompt', value: "Homem idoso lendo jornal em um café na calçada, capturado em um momento espontâneo com expressão genuína, ambiente urbano com luz suave da tarde filtrando através das árvores da rua, foto tirada com lente de 35mm para um campo de visão natural, fundo ligeiramente fora de foco mostrando a vida da cidade, tons de pele e texturas naturais, sensação de cena de rua autêntica, não posada e natural." }] },
        { title: "Prompt 6: Criação de Arte Abstrata", content: [{ type: 'prompt', value: "Formas de metal líquido fluido em tons de ouro e cobre, interagindo com estruturas geométricas cristalinas, capturadas em um momento de tensão dinâmica, iluminação dramática criando profundidade e sombra, foto como se fosse através de uma lente macro revelando texturas de superfície intrincadas, fundo desaparecendo para um preto profundo, curvas orgânicas contrastando com elementos geométricos angulares." }] },
        { title: "Prompt 7: Aprimoramento de Retrato", content: [{ type: 'prompt', value: "Aprimorar a textura da pele para parecer naturalmente suave, mantendo poros realistas e linhas de expressão, ajustar a iluminação para criar um efeito sutil de luz de contorno no cabelo, clarear os olhos ligeiramente para mais engajamento, manter a expressão facial autêntica e os tons de pele naturais." }] },
        { title: "Prompt 8: Substituição de Fundo", content: [{ type: 'prompt', value: "Substituir o fundo atual por um cenário de estúdio profissional em cinza neutro, manter a iluminação natural no sujeito consistente com o novo ambiente, preservar as sombras e os detalhes das bordas do sujeito original, garantir uma integração perfeita entre o sujeito e o novo fundo." }] },
        { title: "Prompt 9: Magia da Gradação de Cores", content: [{ type: 'prompt', value: "Aplicar gradação de cores cinematográfica com destaques quentes e sombras frias, realçar o calor da hora dourada mantendo os tons de pele naturais, aumentar ligeiramente o contraste para uma sensação mais dramática, preservar os detalhes tanto nos destaques quanto nas sombras." }] },
        { title: "Prompt 10: Substituição de Roupas", content: [{ type: 'prompt', value: "Substituir o top branco da mulher por uma jaqueta de couro preta, mantendo o caimento e o ajuste naturais do tecido, preservar as proporções e a postura corporal originais, garantir que a nova roupa siga os padrões naturais de luz e sombra da imagem original." }] },
        { title: "Prompt 11: Transferência de Estilo Artístico", content: [{ type: 'prompt', value: "Transformar esta fotografia para parecer pintada no estilo impressionista, com pinceladas visíveis e mistura suave de cores, manter o reconhecimento do sujeito enquanto adiciona interpretação artística, enfatizar a luz e a cor sobre os detalhes precisos, criar uma renderização artística com qualidade de museu." }] },
        { title: "Prompt 12: Modificação de Iluminação", content: [{ type: 'prompt', value: "Adicionar iluminação lateral dramática vinda da esquerda da câmera, criando sombras e destaques fortes que realçam a estrutura facial, manter os tons de pele naturais enquanto aumenta o contraste, preservar a qualidade e os detalhes da imagem original." }] },
        { title: "Prompt 13: Remoção de Objeto", content: [{ type: 'prompt', value: "Remover o poste telefônico do fundo, preenchendo a área de forma contínua com um cenário contextualmente apropriado, manter a iluminação e a perspectiva naturais, garantir que não haja artefatos ou inconsistências de edição visíveis." }] },
        { title: "Prompt 14: Efeitos Atmosféricos", content: [{ type: 'prompt', value: "Adicionar uma névoa matinal sutil subindo da paisagem, criando profundidade e mistério, mantendo a visibilidade dos elementos-chave, iluminação suave e difusa filtrando através de partículas atmosféricas, realçar a sensação de lugar e a narrativa ambiental." }] },
        { title: "Prompt 15: Retoque Profissional", content: [{ type: 'prompt', value: "Aplicar retoque profissional mantendo a aparência natural, suavizar a pele preservando as linhas de expressão e a textura natural, realçar os olhos para melhor engajamento, ajustar a iluminação para uma aparência mais lisonjeira, manter as qualidades humanas autênticas em toda a imagem." }] }
    ]
};

const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={handleCopy} className="flex-shrink-0 text-sm bg-gray-600 hover:bg-purple-600 text-white font-semibold py-1 px-3 rounded-md transition-colors">
            {copied ? 'Copiado!' : 'Copiar'}
        </button>
    );
};

interface InspirationModalProps {
  isOpen: boolean;
  onClose: () => void;
}
const InspirationModal: React.FC<InspirationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity">
      <div className="bg-gray-800 text-white p-6 rounded-lg shadow-2xl w-full max-w-3xl border border-gray-700 relative flex flex-col max-h-[90vh]">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <CloseIcon className="w-6 h-6" />
        </button>
        
        <div className="flex items-center mb-4 pb-4 border-b border-gray-700">
          <BookOpenIcon className="w-6 h-6 mr-3 text-purple-400" />
          <h2 className="text-2xl font-bold">Biblioteca de Inspiração</h2>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-4 space-y-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-100 mb-2">{inspirationData.intro.title}</h3>
                <div className="space-y-2 text-gray-300">
                {inspirationData.intro.paragraphs.map((p, i) => 
                    p.includes('SUJEITO +') 
                    ? <p key={i} className="font-bold text-center text-purple-300 bg-gray-900 p-2 rounded-md my-4 text-sm tracking-wider">{p}</p>
                    : <p key={i}>{p}</p>
                )}
                </div>
            </div>

            {inspirationData.sections.map(({ title, content }) => (
                <div key={title}>
                    <h3 className="text-lg font-semibold text-purple-400 mb-2">{title}</h3>
                    <div className="space-y-3">
                    {content.map((item, index) => (
                        item.type === 'prompt' 
                        ? (
                            <div key={index} className="p-4 bg-gray-900/70 rounded-md flex justify-between items-start gap-4">
                                <p className="text-gray-200 flex-grow italic">"{item.value}"</p>
                                <CopyButton textToCopy={item.value} />
                            </div>
                        )
                        : <p key={index} className="text-gray-400 px-4" dangerouslySetInnerHTML={{ __html: item.value.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-700 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
    // State
    const [nodes, setNodes] = useState<NodeData[]>(defaultNodes);
    const [edges, setEdges] = useState<Edge[]>(defaultEdges);
    const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    
    // Interaction State
    const [isPanning, setIsPanning] = useState(false);
    const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
    const [draggedTouchId, setDraggedTouchId] = useState<number | null>(null);
    const [nodeDragOffset, setNodeDragOffset] = useState<Point>({ x: 0, y: 0 });
    const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; connectorId: string | number } | null>(null);
    const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });
    const [snapTarget, setSnapTarget] = useState<{ nodeId: string; connectorId: string | number } | null>(null);
    const [resizingNode, setResizingNode] = useState<{ id: string; initialSize: { width: number, height: number }; initialMousePos: Point } | null>(null);
    
    // UI State
    const [contextMenu, setContextMenu] = useState<{ pos: Point; isOpen: boolean }>({ pos: { x: 0, y: 0 }, isOpen: false });
    const [imageViewer, setImageViewer] = useState<{ isOpen: boolean; url: string | null; label: string }>({ isOpen: false, url: null, label: '' });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [sceneSettingsNodeId, setSceneSettingsNodeId] = useState<string | null>(null);
    const [promptSuggestNodeId, setPromptSuggestNodeId] = useState<string | null>(null);
    const [promptSuggestions, setPromptSuggestions] = useState<string[]>([]);
    const [textSuggestionNodeId, setTextSuggestionNodeId] = useState<string | null>(null);
    const [textSuggestions, setTextSuggestions] = useState<string[]>([]);
    const [isInspirationModalOpen, setIsInspirationModalOpen] = useState(false);


    // Refs
    const canvasRef = useRef<HTMLDivElement>(null);
    const lastTouchPosRef = useRef<Point | null>(null);
    const lastPinchDistRef = useRef<number | null>(null);
    
    // --- Helper Functions ---
    const hasValidOutput = (node: NodeData): boolean => {
        if (!node.output) return false;
        switch(node.type) {
            case 'ANALYZE':
            case 'STYLE_EXTRACTOR':
            case 'ENHANCE_PROMPT':
                return !!node.output.text;
            case 'TEXT_INPUT':
            case 'COMBINE':
            case 'SCENE':
            case 'DETAIL':
                return !!node.output.image;
            default:
                return false;
        }
    }

    const clearDownstreamOutputs = useCallback((startNodeId: string, allNodes: NodeData[], allEdges: Edge[]) => {
        const nodesToClear = new Set<string>();
        const queue: string[] = [startNodeId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);
            
            const outgoingEdges = allEdges.filter(e => e.fromNode === currentId);
            for (const edge of outgoingEdges) {
                if (!nodesToClear.has(edge.toNode)) {
                    nodesToClear.add(edge.toNode);
                    queue.push(edge.toNode);
                }
            }
        }
        
        if (nodesToClear.size === 0) {
            return allNodes;
        }
        
        return allNodes.map(n => {
            if (nodesToClear.has(n.id) && n.output) {
                return { ...n, output: undefined };
            }
            return n;
        });
    }, []);

    const updateNode = useCallback((nodeId: string, data: Partial<NodeData>) => {
        setNodes(nds => {
            const originalNode = nds.find(n => n.id === nodeId);
            // Check if a property that invalidates downstream nodes is changing.
            const isSourceDataChanging = originalNode && (
                (data.image && data.image.src !== originalNode.image?.src) || // Input node image changed
                (data.prompt && data.prompt !== originalNode.prompt && originalNode.type === 'TEXT_INPUT') // Text input prompt changed
            );

            let newNodes = nds.map(n => (n.id === nodeId ? { ...n, ...data } : n));
            
            if (isSourceDataChanging) {
                newNodes = clearDownstreamOutputs(nodeId, newNodes, edges);
            }
            
            return newNodes;
        });
    }, [edges, clearDownstreamOutputs]);

    const getHighestZIndex = () => {
        if (nodes.length === 0) return 0;
        return Math.max(...nodes.map(n => n.zIndex || 0));
    }

    const bringNodeToFront = (nodeId: string) => {
        const highestZ = getHighestZIndex();
        updateNode(nodeId, { zIndex: highestZ + 1 });
    }

    const screenToCanvasCoords = (screenPos: Point): Point => {
        if (!canvasRef.current) return screenPos;
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: (screenPos.x - rect.left - pan.x) / zoom,
            y: (screenPos.y - rect.top - pan.y) / zoom,
        };
    };

    // Helper function to determine the type of a connector port ('image' or 'text').
    const getPortType = (node: NodeData, connectorId: string | number, direction: 'in' | 'out'): 'image' | 'text' | null => {
        if (direction === 'out') {
            switch (node.type) {
                case 'STYLE_EXTRACTOR':
                case 'ENHANCE_PROMPT':
                    return 'text';
                case 'ANALYZE':
                    if (connectorId === 'text') return 'text';
                    if (connectorId === 0) return 'image';
                    return null;
                case 'TEXT_INPUT':
                    if (connectorId === 'text') return 'text';
                    if (connectorId === 0) return 'image';
                    return null;
                case 'INPUT':
                case 'COMBINE':
                case 'SCENE':
                case 'DETAIL':
                    return connectorId === 0 ? 'image' : null;
                default:
                    return null;
            }
        } else { // 'in'
            switch (node.type) {
                case 'COMBINE':
                    if (connectorId === 'prompt') return 'text';
                    if (typeof connectorId === 'number') return 'image';
                    return null;
                case 'ENHANCE_PROMPT':
                    return connectorId === 'text' ? 'text' : null;
                case 'ANALYZE':
                case 'STYLE_EXTRACTOR':
                case 'SCENE':
                case 'DETAIL':
                    return typeof connectorId === 'number' ? 'image' : null;
                default:
                    return null;
            }
        }
    };
    
    // --- Super Prompt Builder Logic ---
    const getInfluenceDescription = (influence: number): string => {
        const percent = Math.round(influence * 100);
        if (percent <= 15) return `uma influência muito subtil e quase impercetível (${percent}%)`;
        if (percent <= 35) return `uma influência secundária e subtil (${percent}%)`;
        if (percent <= 65) return `uma fusão equilibrada e significativa (${percent}%)`;
        if (percent <= 85) return `uma influência forte e definidora (${percent}%)`;
        return `uma influência dominante e avassaladora, ditando o resultado final (${percent}%)`;
    };

    const buildSuperPrompt = (nodeId: string, allNodes: NodeData[]): { textPrompt: string, imagePrompt: string, images: {src: string, mimeType: string}[]} => {
        const node = allNodes.find(n => n.id === nodeId);
        if (!node) return { textPrompt: '', imagePrompt: '', images: [] };
    
        const allImages: {src: string, mimeType:string}[] = [];
        const subjectParts: string[] = [];
        const compositionParts: string[] = [];
        const styleDirectives: string[] = [];
        const negativeDirectives: string[] = [];
        const textSubjectDirectives: string[] = [];
    
        // 1. Classify all image inputs based on blend mode
        const imageEdges = edges.filter(e => e.toNode === nodeId && typeof e.toConnector === 'number');
        const orderedConfigs = (node.combineInputsConfig || []).slice();
    
        orderedConfigs.forEach(config => {
            const edge = imageEdges.find(e => e.id === config.edgeId);
            if (!edge) return;
            const sourceNode = allNodes.find(n => n.id === edge.fromNode);
            const image = sourceNode?.output?.image || sourceNode?.image;
            if (!image) return;
    
            const influence = getInfluenceDescription(config.influence);
            allImages.push(image);
    
            switch(config.blendMode) {
                case 'ADD':
                    subjectParts.push(`- O conceito de "${sourceNode?.label}" (com influência ${influence}).`);
                    break;
                case 'COMPOSE':
                    compositionParts.push(`- O objeto de "${sourceNode?.label}" (com influência ${influence}).`);
                    break;
                case 'REFERENCE':
                    styleDirectives.push(`- A estética da imagem de referência "${sourceNode?.label}" (com influência ${influence}). NÃO copie os seus objetos, apenas a sua paleta de cores, iluminação, textura e composição.`);
                    break;
                case 'SUBTRACT':
                    negativeDirectives.push(`- EVITE ATIVAMENTE os elementos, cores ou estilo da imagem de referência "${sourceNode?.label}" (com influência ${influence}).`);
                    break;
                case 'OFF':
                    subjectParts.push(`- O conceito de "${sourceNode?.label}" (com influência ${influence}).`);
                    break;
            }
        });
    
        // 2. Process text inputs from connectors
        const textEdges = edges.filter(e => e.toNode === nodeId && (e.toConnector === 'prompt' || e.toConnector === 'text'));
        textEdges.forEach(edge => {
            const sourceNode = allNodes.find(n => n.id === edge.fromNode);
            if (!sourceNode) return;

            const textOutput = sourceNode.type === 'TEXT_INPUT' ? sourceNode.prompt : sourceNode.output?.text;

            if (textOutput) {
                if (sourceNode.type === 'TEXT_INPUT' || sourceNode.type === 'ENHANCE_PROMPT') {
                    // Text from TEXT_INPUT or ENHANCE_PROMPT is a primary subject directive
                    textSubjectDirectives.push(textOutput);
                } else {
                    // Text from STYLE_EXTRACTOR or ANALYZE is a style directive
                    styleDirectives.push(`- ${textOutput}`);
                }
            }
        });
    
        // 3. Build the final prompt with a strict hierarchy
        const finalPromptParts: string[] = ['**Instrução para a IA de Geração de Imagem - Siga esta estrutura RIGOROSAMENTE:**'];
    
        let subjectSection = '';
        if (compositionParts.length > 0) {
            subjectSection += `\n**1. COMPOSIÇÃO DA CENA (O QUÊ):** Crie uma cena única contendo os seguintes elementos, na ordem listada, para determinar a sua relação espacial (ex: o primeiro é a base, os seguintes estão sobre/ao lado dele):\n${compositionParts.join('\n')}`;
        }
        if (subjectParts.length > 0) {
            const title = compositionParts.length > 0 ? 'Elementos Adicionais para Fusão Conceptual:' : '**1. ASSUNTO(S) PRINCIPAL(IS) (O QUÊ):** O foco central da imagem são os seguintes conceitos:';
            subjectSection += `\n${title}\n${subjectParts.join('\n')}`;
        }
        if (textSubjectDirectives.length > 0) {
            const title = (compositionParts.length > 0 || subjectParts.length > 0) ? 'Instruções de Assunto Adicionais:' : '**1. ASSUNTO(S) PRINCIPAL(IS) (O QUÊ):** O foco central da imagem é o seguinte:';
            subjectSection += `\n${title}\n${textSubjectDirectives.join('\n\n')}`;
        }
    
        if (subjectSection) {
            finalPromptParts.push(subjectSection);
        } else if (allImages.length > 0) {
            finalPromptParts.push('\n**1. ASSUNTO (O QUÊ):** Use a sua criatividade para determinar o assunto com base nas imagens e no estilo fornecidos.');
        } else {
             finalPromptParts.push('\n**1. ASSUNTO (O QUÊ):** Use as instruções do utilizador para criar o assunto.');
        }
    
        if (styleDirectives.length > 0) {
            finalPromptParts.push(`\n**2. DIRETIVA DE ESTILO (COMO):** Renderize o(s) assunto(s) acima seguindo OBRIGATORIAMENTE estas regras de estilo. Estas são diretivas de renderização, NÃO de conteúdo:\n${styleDirectives.join('\n')}`);
        }
    
        if (node.prompt && node.prompt.trim() !== '') {
            finalPromptParts.push(`\n**3. INSTRUÇÕES ADICIONAIS:** Incorpore esta instrução na composição geral: "${node.prompt.trim()}"`);
        }
    
        if (negativeDirectives.length > 0) {
            finalPromptParts.push(`\n**4. RESTRIÇÕES (O QUE NÃO FAZER):** EVITE ATIVAMENTE os seguintes elementos durante a geração:\n${negativeDirectives.join('\n')}`);
        }
    
        const finalCombinedPrompt = finalPromptParts.join('\n');
    
        return { textPrompt: '', imagePrompt: finalCombinedPrompt, images: allImages };
    };

    // --- Main Action Handlers ---
    const handleRunNode = useCallback(async (startNodeId: string) => {
        const executionQueue: string[] = [];
        const visited = new Set<string>();
        const visiting = new Set<string>();

        const buildExecutionQueue = (id: string) => {
            if (visited.has(id)) return;
            if (visiting.has(id)) throw new Error("Ciclo detectado no gráfico de nós. Não é possível executar.");
            visiting.add(id);
            const node = nodes.find(n => n.id === id);
            if (!node) return;
            const inputEdges = edges.filter(e => e.toNode === id);
            for (const edge of inputEdges) {
                buildExecutionQueue(edge.fromNode);
            }
            visiting.delete(id);
            visited.add(id);
            executionQueue.push(id);
        };

        try {
            buildExecutionQueue(startNodeId);
        } catch (e: any) {
            updateNode(startNodeId, { isProcessing: false, errorMessage: e.message });
            console.error(e);
            return;
        }
        
        let currentNodesState = [...nodes];

        for (const nodeId of executionQueue) {
            const node = currentNodesState.find(n => n.id === nodeId)!;
            
            // Skip re-running nodes that already have a valid output, unless it's the node we explicitly want to run.
            if (nodeId !== startNodeId && hasValidOutput(node)) {
                continue;
            }

            const isProcessingNode = ['COMBINE', 'ANALYZE', 'SCENE', 'STYLE_EXTRACTOR', 'TEXT_INPUT', 'DETAIL', 'ENHANCE_PROMPT'].includes(node.type);
            
            if (!isProcessingNode) {
                continue;
            }

            bringNodeToFront(nodeId);
            const previousOutput = node.output;
            updateNode(nodeId, { isProcessing: true, errorMessage: undefined, output: (node.type === 'COMBINE' || node.type === 'SCENE' || node.type === 'TEXT_INPUT' || node.type === 'ANALYZE') ? previousOutput : undefined });
            
            try {
                let result: { output: NodeOutput };
                const inputEdges = edges.filter(e => e.toNode === nodeId);

                switch (node.type) {
                    case 'TEXT_INPUT': {
                        if (!node.prompt) throw new Error("O nó de texto não tem conteúdo para gerar uma imagem.");
                        const outputImage = await geminiService.generateImageFromText(node.prompt);
                        result = { output: outputImage };
                        break;
                    }
                    case 'ANALYZE': {
                        const imageEdge = inputEdges.find(e => e.toConnector === 0);
                        if (!imageEdge) throw new Error("A imagem de entrada não está conectada.");
                        const sourceNode = currentNodesState.find(n => n.id === imageEdge.fromNode);
                        const image = sourceNode?.output?.image || sourceNode?.image || null;
                        if (!image) throw new Error("O nó de entrada não tem dados de imagem.");

                        const prompt = node.prompt || "Descreva esta imagem em detalhe.";
                        const text = await geminiService.analyzeImage(prompt, image.src, image.mimeType);
                        result = { output: { text, image } };
                        break;
                    }
                    case 'STYLE_EXTRACTOR': {
                        const imageEdge = inputEdges.find(e => e.toConnector === 0);
                        if (!imageEdge) throw new Error("A imagem de entrada não está conectada.");
                        const sourceNode = currentNodesState.find(n => n.id === imageEdge.fromNode);
                        const image = sourceNode?.output?.image || sourceNode?.image || null;
                        if (!image) throw new Error("O nó de entrada não tem dados de imagem.");
                        
                        const text = await geminiService.extractStyle(image.src, image.mimeType, node.styleIntensity ?? 1.0);
                        result = { output: { text } };
                        break;
                    }
                    case 'ENHANCE_PROMPT': {
                        const textEdge = inputEdges.find(e => e.toConnector === 'text');
                        if (!textEdge) throw new Error("A entrada de texto não está conectada.");
                        const sourceNode = currentNodesState.find(n => n.id === textEdge.fromNode);
                        const inputText = sourceNode?.type === 'TEXT_INPUT' ? sourceNode.prompt : sourceNode?.output?.text;
                        if (!inputText) throw new Error("O nó de entrada não tem texto.");
                        if (!node.prompt || !node.prompt.trim()) throw new Error("Forneça uma instrução de refinamento.");
    
                        const enhancedText = await geminiService.enhancePrompt(inputText, node.prompt);
                        result = { output: { text: enhancedText } };
                        break;
                    }
                    case 'COMBINE': {
                        const { imagePrompt, images } = buildSuperPrompt(nodeId, currentNodesState);
                        if (images.length === 0 && (!node.prompt || !node.prompt.trim())) throw new Error("Conecte uma imagem ou adicione uma instrução.");
                        const outputImage = await geminiService.combineImages(imagePrompt, images);
                        result = { output: outputImage };
                        break;
                    }
                    case 'DETAIL': {
                        const imageEdge = inputEdges.find(e => e.toConnector === 0);
                        if (!imageEdge) throw new Error("A imagem de entrada não está conectada.");
                        const sourceNode = currentNodesState.find(n => n.id === imageEdge.fromNode);
                        const image = sourceNode?.output?.image || sourceNode?.image || null;
                        if (!image) throw new Error("O nó de entrada não tem dados de imagem.");
                        if (!node.prompt || !node.prompt.trim()) throw new Error("Adicione uma instrução de refinamento.");
                        
                        let outputImage;
                        if (node.mask?.src) {
                            // Path with mask
                            outputImage = await geminiService.refineImage(node.prompt, image, node.mask);
                        } else {
                            // Maskless path for general refinement
                            outputImage = await geminiService.combineImages(node.prompt, [image]);
                        }
                        result = { output: outputImage };
                        break;
                    }
                    case 'SCENE': {
                        const objectNodes = inputEdges
                            .map(edge => currentNodesState.find(n => n.id === edge.fromNode))
                            .filter(Boolean) as NodeData[];
                        
                        if (!node.sceneSettings) throw new Error("As definições de cena não estão configuradas.");
                        const outputImage = await geminiService.renderScene(node.sceneSettings, objectNodes);
                        result = { output: outputImage };
                        break;
                    }
                    default:
                        throw new Error("Tipo de nó desconhecido ou não processável.");
                }
                
                updateNode(nodeId, { isProcessing: false, ...result });
                currentNodesState = currentNodesState.map(n => 
                    n.id === nodeId ? { ...n, isProcessing: false, ...result } : n
                );

            } catch (error: any) {
                console.error(`Erro ao executar o nó "${node.label}":`, error);
                const errorMessage = (error instanceof Error ? error.message : String(error)) || 'Ocorreu um erro desconhecido.';
                updateNode(nodeId, { isProcessing: false, errorMessage: errorMessage });
                setTimeout(() => updateNode(nodeId, { errorMessage: undefined }), 5000);
                return; 
            }
        }
    }, [nodes, edges, updateNode, buildSuperPrompt]);
    
    const handleDeleteNode = (nodeId: string) => {
        const remainingEdges = edges.filter(e => e.fromNode !== nodeId && e.toNode !== nodeId);
        const remainingEdgeIds = new Set(remainingEdges.map(e => e.id));
        setEdges(remainingEdges);
    
        const remainingNodes = nodes.filter(n => n.id !== nodeId);
    
        const updatedNodes = remainingNodes.map(n => {
            const updates: Partial<NodeData> = {};
            
            if (n.promptSourceNodeIds?.includes(nodeId)) {
                updates.promptSourceNodeIds = n.promptSourceNodeIds.filter(id => id !== nodeId);
            }
            
            if (n.type === 'COMBINE' && n.combineInputsConfig) {
                const newConfig = n.combineInputsConfig.filter(config => remainingEdgeIds.has(config.edgeId));
                if (newConfig.length !== n.combineInputsConfig.length) {
                    updates.combineInputsConfig = newConfig;
                }
            }
            
            return Object.keys(updates).length > 0 ? { ...n, ...updates } : n;
        });
    
        setNodes(updatedNodes);
    };

    const handleAddNode = (type: NodeType) => {
        const position = screenToCanvasCoords(contextMenu.pos);
        
        const nodeLabels: { [key in NodeType]: string } = {
          INPUT: 'Nó de Entrada',
          TEXT_INPUT: 'Nó de Texto',
          COMBINE: 'Nó de Combinação',
          ANALYZE: 'Nó de Análise',
          STYLE_EXTRACTOR: 'Extrator de Estilo',
          SCENE: 'Nó de Cena',
          DETAIL: 'Nó de Detalhe',
          ENHANCE_PROMPT: 'Refinador de Texto',
        };

        const newNode: NodeData = {
            id: `${type.toLowerCase()}-${Date.now()}`,
            type,
            label: nodeLabels[type] || `${type.charAt(0)}${type.slice(1).toLowerCase()} Nó`,
            position,
            width: 300,
            height: 200,
            zIndex: getHighestZIndex() + 1,
            selected: true,
        };
        
        switch (type) {
            case 'INPUT':
                newNode.width = 250;
                newNode.height = 250;
                break;
            case 'TEXT_INPUT':
                newNode.prompt = "";
                newNode.height = 350;
                break;
            case 'COMBINE':
                newNode.height = 500;
                newNode.promptSourceNodeIds = [];
                newNode.combineInputsConfig = [];
                break;
            case 'SCENE':
                newNode.height = 300;
                newNode.sceneSettings = {
                    cameraElevation: 'eye-level',
                    renderStyle: 'photorealistic-day',
                    objects: []
                };
                break;
            case 'STYLE_EXTRACTOR':
                newNode.height = 250;
                newNode.styleIntensity = 1.0;
                break;
            case 'ANALYZE':
                 newNode.height = 350;
                 newNode.prompt = `Realize uma análise visual aprofundada da imagem fornecida. Desmembre a sua descrição nos seguintes seis componentes-chave, fornecendo detalhes para cada um. O objetivo é criar um prompt detalhado que possa ser usado para recriar ou se inspirar nesta imagem.

1.  **SUJEITO:** Descreva o(s) sujeito(s) principal(is) com detalhes (ex: 'uma jovem com sardas', 'um relógio suíço de luxo').
2.  **AÇÃO:** O que o sujeito está a fazer? (ex: 'sorrindo pensativamente', 'posicionado num ângulo de três quartos').
3.  **AMBIENTE:** Onde a cena se passa? (ex: 'num café aconchegante perto da janela', 'num escritório corporativo moderno').
4.  **ESTILO DE ARTE:** Qual é o meio e o estilo? (ex: 'Fotografia tirada com uma lente de 85mm', 'pintura a óleo impressionista', 'renderização 3D fotorrealista').
5.  **ILUMINAÇÃO:** Descreva as condições de iluminação. (ex: 'luz natural da janela', 'iluminação de estúdio com softbox', 'hora dourada').
6.  **DETALHES:** Mencione quaisquer outros detalhes importantes ou elementos de composição. (ex: 'xícara de café quente nas mãos', 'fundo com foco suave', 'rochas em primeiro plano').`;
                 break;
            case 'DETAIL':
                newNode.width = 400;
                newNode.height = 500;
                newNode.prompt = "";
                newNode.isMasking = false;
                newNode.brushSize = 40;
                break;
            case 'ENHANCE_PROMPT':
              newNode.height = 300;
              newNode.prompt = "";
              break;
        }

        setNodes(nds => [...nds.map(n => ({...n, selected: false})), newNode]);
    };
    
    const handleSuggestPrompts = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if(!node) return;

        updateNode(nodeId, { isProcessing: true, errorMessage: undefined });
        try {
            const { imagePrompt, images } = buildSuperPrompt(nodeId, nodes);
            
            if (images.length === 0) throw new Error("Conecte pelo menos uma imagem para sugerir instruções.");

            const suggestions = await geminiService.suggestPrompts(images, imagePrompt);
            setPromptSuggestions(suggestions);
            setPromptSuggestNodeId(nodeId);
        } catch (error: any) {
            updateNode(nodeId, { errorMessage: error.message || 'Falha ao obter sugestões.' });
        } finally {
            updateNode(nodeId, { isProcessing: false });
        }
    }
    
    const handleSuggestTextVariations = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if(!node || !node.prompt) return;

        updateNode(nodeId, { isProcessing: true, errorMessage: undefined });
        try {
            const suggestions = await geminiService.suggestTextVariations(node.prompt);
            setTextSuggestions(suggestions);
            setTextSuggestionNodeId(nodeId);
        } catch (error: any) {
            updateNode(nodeId, { errorMessage: error.message || 'Falha ao obter sugestões.' });
        } finally {
            updateNode(nodeId, { isProcessing: false });
        }
    }

    const handleRefineImage = async (nodeId: string, prompt: string, image: {src: string, mimeType: string}, mask: {src: string, mimeType: string}) => {
         const node = nodes.find(n => n.id === nodeId);
         if (!node) return;
         updateNode(nodeId, { isProcessing: true, errorMessage: undefined });
         try {
             const result = await geminiService.refineImage(prompt, image, mask);
             updateNode(nodeId, { output: result });
             setEditingNodeId(null);
         } catch(error: any) {
             updateNode(nodeId, { errorMessage: error.message || 'Falha ao refinar a imagem.' });
         } finally {
             updateNode(nodeId, { isProcessing: false });
         }
    };
    
    // --- Mouse & Touch Event Handlers for Nodes/Connectors ---

    const handleNodeInteractionStart = (nodeId: string) => {
        setNodes(nds => {
            const highestZ = Math.max(...nds.map(n => n.zIndex || 0));
            return nds.map(n => ({
                ...n,
                selected: n.id === nodeId,
                zIndex: n.id === nodeId ? highestZ + 1 : n.zIndex,
            }));
        });
    };

    const handleNodeResizeStart = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        setResizingNode({
            id: nodeId,
            initialSize: { width: node.width, height: node.height },
            initialMousePos: { x: e.clientX, y: e.clientY },
        });
    };

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        if (e.button === 2) return;
        e.stopPropagation();
        
        const node = nodes.find(n => n.id === nodeId)!;
        handleNodeInteractionStart(nodeId);
        
        setDraggedNodeId(nodeId);
        setNodeDragOffset({
            x: node.position.x - (e.clientX / zoom),
            y: node.position.y - (e.clientY / zoom),
        });
    };

    const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];

        const node = nodes.find(n => n.id === nodeId)!;
        handleNodeInteractionStart(nodeId);
        
        setDraggedTouchId(touch.identifier);
        setDraggedNodeId(nodeId);
        setNodeDragOffset({
            x: node.position.x - (touch.clientX / zoom),
            y: node.position.y - (touch.clientY / zoom),
        });
    };
    
    const handleConnectorMouseDown = (e: React.MouseEvent, nodeId: string, connectorId: string | number) => {
        e.stopPropagation();
        setConnectingFrom({ nodeId, connectorId });
    };

    const handleConnectorTouchStart = (e: React.TouchEvent, nodeId: string, connectorId: string | number) => {
        e.stopPropagation();
        if (e.touches.length !== 1) return;
        setConnectingFrom({ nodeId, connectorId });
    };
    
    const handleDisconnectAndReconnect = (e: React.MouseEvent | React.TouchEvent, toNodeId: string, toConnectorId: string | number) => {
        const edgeToDisconnect = edges.find(edge => edge.toNode === toNodeId && edge.toConnector === toConnectorId);
        if (!edgeToDisconnect) return;

        // Fix: Resolve property access errors by safely extracting event coordinates with a more specific type.
        let point: React.Touch | React.MouseEvent | undefined;
        if ('touches' in e) {
            // Touch event
            if (e.touches.length > 0) {
                point = e.touches[0];
            }
        } else {
            // Mouse event
            point = e;
        }

        if (point) {
            setMousePos({ x: point.clientX, y: point.clientY });
        }

        setConnectingFrom({
            nodeId: edgeToDisconnect.fromNode,
            connectorId: edgeToDisconnect.fromConnector,
        });

        setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeToDisconnect.id));

        const toNode = nodes.find(n => n.id === toNodeId);
        if (toNode?.type === 'COMBINE') {
            if (toConnectorId === 'prompt') {
                updateNode(toNodeId, {
                    promptSourceNodeIds: (toNode.promptSourceNodeIds || []).filter(id => id !== edgeToDisconnect.fromNode),
                });
            } else {
                updateNode(toNodeId, {
                    combineInputsConfig: (toNode.combineInputsConfig || []).filter(c => c.edgeId !== edgeToDisconnect.id),
                });
            }
        }
    };

    const completeConnection = (toNodeId: string, toConnectorId: string | number) => {
        if (!connectingFrom) return;

        const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
        const toNode = nodes.find(n => n.id === toNodeId);

        if (!fromNode || !toNode || fromNode.id === toNode.id) return;

        const fromType = getPortType(fromNode, connectingFrom.connectorId, 'out');
        const toType = getPortType(toNode, toConnectorId, 'in');

        if (!fromType || !toType || fromType !== toType) return;

        if (toType === 'image' && edges.some(edge => edge.toNode === toNodeId && edge.toConnector === toConnectorId)) return;
        if (toType === 'text' && edges.some(edge => edge.toNode === toNodeId && edge.toConnector === toConnectorId)) return;

        const newEdge: Edge = {
            id: `${fromNode.id}-${connectingFrom.connectorId}-to-${toNode.id}-${toConnectorId}-${Date.now()}`,
            fromNode: fromNode.id,
            fromConnector: connectingFrom.connectorId,
            toNode: toNode.id,
            toConnector: toConnectorId,
        };

        setEdges(eds => [...eds, newEdge]);
        
        if (toNode.type === 'COMBINE') {
            if (toType === 'text') {
                const currentSources = toNode.promptSourceNodeIds || [];
                updateNode(toNode.id, { promptSourceNodeIds: [...currentSources, fromNode.id] });
            } else if (toType === 'image') {
                const newConfig: CombineInputConfig = { edgeId: newEdge.id, influence: 1.0, blendMode: 'ADD' };
                const currentConfig = toNode.combineInputsConfig || [];
                updateNode(toNode.id, { combineInputsConfig: [...currentConfig, newConfig] });
            }
        }
    }
    
    // --- Canvas Interaction Handlers ---

    const handleZoomToFit = useCallback(() => {
        if (!canvasRef.current) return;
    
        if (nodes.length === 0) {
            setZoom(1);
            setPan({ x: 0, y: 0 });
            return;
        }
    
        const rect = canvasRef.current.getBoundingClientRect();
        const padding = 100;
    
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
        nodes.forEach(node => {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + node.width);
            maxY = Math.max(maxY, node.position.y + node.height);
        });
    
        const boundsWidth = maxX - minX;
        const boundsHeight = maxY - minY;
    
        if (boundsWidth <= 0 || boundsHeight <= 0) {
            setZoom(1);
            const centerX = minX + boundsWidth / 2;
            const centerY = minY + boundsHeight / 2;
            setPan({
                x: (rect.width / 2) - centerX,
                y: (rect.height / 2) - centerY,
            });
            return;
        }
    
        const effectiveViewportWidth = rect.width - padding * 2;
        const effectiveViewportHeight = rect.height - padding * 2;
    
        const zoomX = effectiveViewportWidth / boundsWidth;
        const zoomY = effectiveViewportHeight / boundsHeight;
    
        const newZoom = Math.min(zoomX, zoomY, 1.2);
        const clampedZoom = Math.max(0.2, newZoom);
    
        const boundsCenterX = minX + boundsWidth / 2;
        const boundsCenterY = minY + boundsHeight / 2;
    
        const newPanX = (rect.width / 2) - (boundsCenterX * clampedZoom);
        const newPanY = (rect.height / 2) - (boundsCenterY * clampedZoom);
    
        setZoom(clampedZoom);
        setPan({ x: newPanX, y: newPanY });
    }, [nodes]);

    const handleDoubleClick = (e: React.MouseEvent) => {
        const targetIsCanvas = e.target === canvasRef.current || (e.target as HTMLElement).parentElement === canvasRef.current;
        if (targetIsCanvas) {
            handleZoomToFit();
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        const targetIsCanvas = e.target === canvasRef.current || (e.target as HTMLElement).parentElement === canvasRef.current;
        if (targetIsCanvas) {
             setNodes(nds => nds.map(n => ({...n, selected: false})));
        }

        if (e.button === 2 || e.ctrlKey) return;
        
        if (e.button === 0 && targetIsCanvas) {
            setIsPanning(true);
        }
    };
    
    const getNodeInputConnectors = (node: NodeData, allEdges: Edge[]) => {
        let imageInputs: number[] = [];
        let textInput: 'prompt' | 'text' | null = null;
    
        switch (node.type) {
            case 'COMBINE':
                const connectedInputs = allEdges.filter(e => e.toNode === node.id && typeof e.toConnector === 'number').length;
                imageInputs = [...Array(connectedInputs + 1).keys()];
                textInput = 'prompt';
                break;
            case 'ANALYZE':
            case 'STYLE_EXTRACTOR':
            case 'DETAIL':
                imageInputs = [0];
                break;
            case 'ENHANCE_PROMPT':
                textInput = 'text';
                break;
            case 'SCENE':
                const connectedSceneInputs = allEdges.filter(e => e.toNode === node.id).length;
                imageInputs = [...Array(connectedSceneInputs + 1).keys()];
                break;
        }
        return { imageInputs, textInput };
    }

    const findSnapTarget = (cursorPos: Point): { nodeId: string; connectorId: string | number } | null => {
        if (!connectingFrom) return null;
    
        const canvasCursorPos = screenToCanvasCoords(cursorPos);
        let closestTarget = null;
        let minDistance = Infinity;
        
        const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
        if (!fromNode) return null;
        const fromType = getPortType(fromNode, connectingFrom.connectorId, 'out');
        if (!fromType) return null;
    
        for (const node of nodes) {
            if (node.id === connectingFrom.nodeId) continue;
    
            const { imageInputs, textInput } = getNodeInputConnectors(node, edges);
            const potentialConnectors: (string | number)[] = [...imageInputs];
            if (textInput) {
                potentialConnectors.push(textInput);
            }

            for (const connectorId of potentialConnectors) {
                const toType = getPortType(node, connectorId, 'in');
                if (fromType === toType) {
                    // Prevent connecting to an already occupied port
                    if (edges.some(e => e.toNode === node.id && e.toConnector === connectorId)) {
                        continue;
                    }
                    const pos = getConnectorPosition(node, connectorId, 'in', edges);
                    const dist = Math.hypot(pos.x - canvasCursorPos.x, pos.y - canvasCursorPos.y);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestTarget = { nodeId: node.id, connectorId: connectorId };
                    }
                }
            }
        }
        
        const canvasSnapRadius = 30 / zoom;
        if (minDistance < canvasSnapRadius) {
            return closestTarget;
        }
    
        return null;
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
        
        if (connectingFrom) {
            setSnapTarget(findSnapTarget({x: e.clientX, y: e.clientY}));
        }

        if (isPanning) {
            setPan(p => ({ x: p.x + e.movementX, y: p.y + e.movementY }));
        }
        if (draggedNodeId) {
            const newPos = {
                x: nodeDragOffset.x + (e.clientX / zoom),
                y: nodeDragOffset.y + (e.clientY / zoom),
            };
            updateNode(draggedNodeId, { position: newPos });
        }
        if (resizingNode) {
            const dx = (e.clientX - resizingNode.initialMousePos.x) / zoom;
            const dy = (e.clientY - resizingNode.initialMousePos.y) / zoom;
            const newWidth = Math.max(350, resizingNode.initialSize.width + dx);
            const newHeight = Math.max(250, resizingNode.initialSize.height + dy);
            updateNode(resizingNode.id, { width: newWidth, height: newHeight });
        }
    };

    const handleMouseUp = () => {
        if (connectingFrom && snapTarget) {
            completeConnection(snapTarget.nodeId, snapTarget.connectorId);
        }
        setIsPanning(false);
        setDraggedNodeId(null);
        setConnectingFrom(null);
        setSnapTarget(null);
        setResizingNode(null);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const mousePoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        
        const zoomFactor = 1.1;
        const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
        const zoomClamped = Math.max(0.2, Math.min(2, newZoom));

        const panX = mousePoint.x - (mousePoint.x - pan.x) * (zoomClamped / zoom);
        const panY = mousePoint.y - (mousePoint.y - pan.y) * (zoomClamped / zoom);

        setZoom(zoomClamped);
        setPan({ x: panX, y: panY });
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenu({ pos: { x: e.clientX, y: e.clientY }, isOpen: true });
    };

    // --- Touch Event Handlers for Canvas ---

    const handleTouchStart = (e: React.TouchEvent) => {
        const targetIsNode = !!(e.target as HTMLElement).closest('[data-is-node="true"]');

        if (e.touches.length === 1 && !targetIsNode) {
            setIsPanning(true);
            lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            setIsPanning(false);
            lastTouchPosRef.current = null;
            
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (draggedNodeId && draggedTouchId !== null) {
            e.preventDefault();
            // Fix: Replaced array iteration with a for...of loop for more robust type safety.
            let touch: React.Touch | undefined;
            // FIX: Add type assertion to resolve error where loop variable `t` was of type `unknown`.
            for (const t of Array.from(e.touches) as React.Touch[]) {
              if (t.identifier === draggedTouchId) {
                touch = t;
                break;
              }
            }
            
            if (touch) {
                const newPos = { x: nodeDragOffset.x + (touch.clientX / zoom), y: nodeDragOffset.y + (touch.clientY / zoom) };
                updateNode(draggedNodeId, { position: newPos });
                setMousePos({ x: touch.clientX, y: touch.clientY });
            }
            return;
        }
        
        if (connectingFrom) {
            e.preventDefault();
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                setMousePos({ x: touch.clientX, y: touch.clientY });
                setSnapTarget(findSnapTarget({x: touch.clientX, y: touch.clientY}));
            }
            return;
        }

        if (e.touches.length === 1 && isPanning && lastTouchPosRef.current) {
            e.preventDefault();
            const touch = e.touches[0];
            const dx = touch.clientX - lastTouchPosRef.current.x;
            const dy = touch.clientY - lastTouchPosRef.current.y;
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
            lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        } else if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dx = touch1.clientX - touch2.clientX;
            const dy = touch1.clientY - touch2.clientY;
            const currentDist = Math.sqrt(dx * dx + dy * dy);

            if (!canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const midpoint = { x: (touch1.clientX + touch2.clientX) / 2 - rect.left, y: (touch1.clientY + touch2.clientY) / 2 - rect.top };
            const zoomFactor = currentDist / lastPinchDistRef.current;
            const newZoom = zoom * zoomFactor;
            const zoomClamped = Math.max(0.2, Math.min(2, newZoom));
            const panX = midpoint.x - (midpoint.x - pan.x) * (zoomClamped / zoom);
            const panY = midpoint.y - (midpoint.y - pan.y) * (zoomClamped / zoom);
            setZoom(zoomClamped);
            setPan({ x: panX, y: panY });
            lastPinchDistRef.current = currentDist;
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (connectingFrom) {
            if (snapTarget) {
                completeConnection(snapTarget.nodeId, snapTarget.connectorId);
            }
            setConnectingFrom(null);
            setSnapTarget(null);
        }

        if (draggedTouchId !== null) {
            // Fix: Replaced array iteration with a for...of loop for more robust type safety.
            let touchEnded = false;
            // FIX: Add type assertion to resolve error where loop variable `t` was of type `unknown`.
            for (const t of Array.from(e.changedTouches) as React.Touch[]) {
                if (t.identifier === draggedTouchId) {
                    touchEnded = true;
                    break;
                }
            }

            if (touchEnded) {
                setDraggedNodeId(null);
                setDraggedTouchId(null);
            }
        }
        
        if (e.touches.length < 2) {
            lastPinchDistRef.current = null;
        }

        if (e.touches.length === 1) {
            setIsPanning(true);
            lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 0) {
            setIsPanning(false);
            lastTouchPosRef.current = null;
        }
    };

    // --- Render ---

    const renderConnectingEdge = () => {
        if (!connectingFrom) return null;
        const fromNode = nodes.find(n => n.id === connectingFrom.nodeId);
        if (!fromNode) return null;

        const startPos = getConnectorPosition(fromNode, connectingFrom.connectorId, 'out', edges);
        
        let endPos = screenToCanvasCoords(mousePos);
        if(snapTarget) {
            const targetNode = nodes.find(n => n.id === snapTarget.nodeId);
            if (targetNode) {
                endPos = getConnectorPosition(targetNode, snapTarget.connectorId, 'in', edges);
            }
        }

        return <EdgeComponent startPos={startPos} endPos={endPos} id="connecting" />;
    };

    const editingNode = nodes.find(n => n.id === editingNodeId);
    const sceneSettingsNode = nodes.find(n => n.id === sceneSettingsNodeId);
    
    return (
        <div className="w-screen h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
            <Header onOpenInspiration={() => setIsInspirationModalOpen(true)} />
            <main className="flex-grow relative" ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={handleDoubleClick}
            >
                <div className="absolute inset-0" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{width: '9999px', height: '9999px'}}>
                        {edges.map(edge => {
                            const fromNode = nodes.find(n => n.id === edge.fromNode);
                            const toNode = nodes.find(n => n.id === edge.toNode);
                            if (!fromNode || !toNode) return null;

                            const startPos = getConnectorPosition(fromNode, edge.fromConnector, 'out', edges);
                            const endPos = getConnectorPosition(toNode, edge.toConnector, 'in', edges);

                            // Determine edge state and appearance
                            let color = '#818cf8'; // Default: indigo-400
                            let strokeWidth = 2.5;
                            let isAnimated = false;

                            if (toNode.isProcessing) {
                                color = '#a855f7'; // Active: purple-500
                                isAnimated = true;
                            } else if (toNode.errorMessage) {
                                color = '#ef4444'; // Error: red-500
                            }

                            if (toNode.type === 'COMBINE' && toNode.combineInputsConfig) {
                                const config = toNode.combineInputsConfig.find(c => c.edgeId === edge.id);
                                if (config) {
                                    // Map influence (0.0 to 1.0) to stroke width (e.g., 1.5 to 5.0)
                                    strokeWidth = 1.5 + (config.influence * 3.5);
                                }
                            }
                            
                            return <EdgeComponent 
                                key={edge.id} 
                                id={edge.id}
                                startPos={startPos} 
                                endPos={endPos} 
                                color={color}
                                strokeWidth={strokeWidth}
                                isAnimated={isAnimated}
                            />;
                        })}
                        {renderConnectingEdge()}
                    </svg>

                    {nodes.map(node => (
                        <NodeComponent 
                            key={node.id}
                            node={node}
                            nodes={nodes}
                            edges={edges}
                            snapTarget={snapTarget}
                            onMouseDown={handleNodeMouseDown}
                            onTouchStart={handleNodeTouchStart}
                            onConnectorMouseDown={handleConnectorMouseDown}
                            onConnectorTouchStart={handleConnectorTouchStart}
                            onDisconnectAndReconnect={handleDisconnectAndReconnect}
                            onUpdateNode={updateNode}
                            onDeleteNode={handleDeleteNode}
                            onRunNode={handleRunNode}
                            onOpenImageEditor={() => setEditingNodeId(node.id)}
                            onOpenSceneSettings={() => setSceneSettingsNodeId(node.id)}
                            onViewImage={(url, label) => setImageViewer({isOpen: true, url, label})}
                            onSuggestPrompts={handleSuggestPrompts}
                            onSuggestTextVariations={handleSuggestTextVariations}
                            onNodeResizeStart={handleNodeResizeStart}
                        />
                    ))}
                </div>
            </main>
            
            {contextMenu.isOpen && <AddNodeContextMenu position={contextMenu.pos} onClose={() => setContextMenu({ ...contextMenu, isOpen: false })} onSelect={handleAddNode} />}
            <ImageViewerModal isOpen={imageViewer.isOpen} imageUrl={imageViewer.url} nodeLabel={imageViewer.label} onClose={() => setImageViewer({ isOpen: false, url: null, label: '' })}/>
            <ImageEditorModal 
                isOpen={!!editingNodeId} 
                node={editingNode || null}
                onClose={() => setEditingNodeId(null)}
                onSubmit={handleRefineImage}
                isProcessing={editingNode?.isProcessing || false}
            />
            {sceneSettingsNodeId && 
                <SceneSettingsModal
                    isOpen={!!sceneSettingsNodeId}
                    sceneNode={sceneSettingsNode!}
                    // Fix: Corrected type name from 'DataNode' to 'NodeData'.
                    objectNodes={edges.filter(e => e.toNode === sceneSettingsNodeId).map(e => nodes.find(n => n.id === e.fromNode)).filter(Boolean) as NodeData[]}
                    onClose={() => setSceneSettingsNodeId(null)}
                    onSubmit={(settings: SceneSettings) => {
                        updateNode(sceneSettingsNodeId, { sceneSettings: settings });
                        setSceneSettingsNodeId(null);
                    }}
                />
            }
            {promptSuggestNodeId &&
                <PromptSuggestionsModal 
                    isOpen={!!promptSuggestNodeId}
                    title="Sugestões de Instruções"
                    suggestions={promptSuggestions}
                    onClose={() => setPromptSuggestNodeId(null)}
                    onSelect={(prompt) => {
                        const currentNode = nodes.find(n => n.id === promptSuggestNodeId);
                        if(currentNode) {
                            const newPrompt = currentNode.prompt ? `${currentNode.prompt} ${prompt}` : prompt;
                            updateNode(promptSuggestNodeId, { prompt: newPrompt });
                        }
                        setPromptSuggestNodeId(null);
                    }}
                />
            }
            {textSuggestionNodeId &&
                <PromptSuggestionsModal 
                    isOpen={!!textSuggestionNodeId}
                    title="Sugestões de Variações de Texto"
                    suggestions={textSuggestions}
                    onClose={() => setTextSuggestionNodeId(null)}
                    onSelect={(prompt) => {
                        updateNode(textSuggestionNodeId, { prompt: prompt });
                        setTextSuggestionNodeId(null);
                    }}
                />
            }
            <InspirationModal isOpen={isInspirationModalOpen} onClose={() => setIsInspirationModalOpen(false)} />
        </div>
    );
};

export default App;