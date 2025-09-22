// Fix: Moved Point interface here from utils.ts to resolve circular dependency and export issues.
export interface Point {
    x: number;
    y: number;
}

export interface NodeOutput {
    text?: string;
    image?: {
        src: string;
        mimeType: string;
    };
}

export interface SceneObjectSettings {
    nodeId: string;
    scale: number;
    rotation: 'front' | 'left' | 'right' | 'back';
}

export interface SceneSettings {
    cameraElevation: 'eye-level' | 'low-angle' | 'high-angle' | 'top-down';
    renderStyle: 'photorealistic-day' | 'photorealistic-night' | 'architectural-sketch' | 'clay-model';
    objects: SceneObjectSettings[];
}

export type NodeType = 'INPUT' | 'TEXT_INPUT' | 'COMBINE' | 'SCENE' | 'ANALYZE' | 'STYLE_EXTRACTOR' | 'DETAIL';

export type BlendMode = 'ADD' | 'SUBTRACT' | 'REFERENCE' | 'COMPOSE' | 'OFF';

export interface CombineInputConfig {
    edgeId: string;
    influence: number; // 0 to 1
    blendMode: BlendMode;
}


export interface NodeData {
  id: string;
  type: NodeType;
  label: string;
  position: Point;
  width: number;
  height: number;
  // Data specific to the node type
  prompt?: string;
  image?: {
      src: string;
      mimeType: string;
  };
  output?: NodeOutput;
  sceneSettings?: SceneSettings;
  promptSourceNodeIds?: string[]; // For prompt connections
  styleIntensity?: number; // For STYLE_EXTRACTOR nodes, from 0.0 to 1.0
  combineInputsConfig?: CombineInputConfig[]; // For COMBINE nodes
  
  // State
  isProcessing?: boolean;
  errorMessage?: string;
  selected?: boolean;
  zIndex?: number;
  
  // Detail Node State
  isMasking?: boolean;
  mask?: {
      src: string;
      mimeType: string;
  };
  brushSize?: number;
}

export interface Edge {
  id: string;
  fromNode: string;
  fromConnector: number | string;
  toNode: string;
  toConnector: number | string;
}