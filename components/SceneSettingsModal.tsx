import React, { useState, useEffect } from 'react';
import { NodeData, SceneSettings, SceneObjectSettings } from '../types';
import { CloseIcon, CubeIcon, RotateCwIcon } from './icons';

interface SceneSettingsModalProps {
  isOpen: boolean;
  sceneNode: NodeData | null; // Can be null when closed
  objectNodes: NodeData[];
  onClose: () => void;
  onSubmit: (settings: SceneSettings) => void;
}

const SceneSettingsModal: React.FC<SceneSettingsModalProps> = ({ isOpen, sceneNode, objectNodes, onClose, onSubmit }) => {
  const [settings, setSettings] = useState<SceneSettings | null>(null);

  useEffect(() => {
    // This effect initializes the modal's state ONLY when it opens for a node.
    // It creates a stable local copy of the settings to work with, preventing
    // parent re-renders from overwriting user interactions.
    if (isOpen && sceneNode) {
        const currentObjectIds = new Set(objectNodes.map(n => n.id));
        const baseSettings = sceneNode.sceneSettings!;
        
        // Filter out settings for objects that may have been deleted
        const existingSettings = baseSettings.objects.filter(o => currentObjectIds.has(o.nodeId));
        const existingSettingsIds = new Set(existingSettings.map(o => o.nodeId));
        
        // Find any new objects that need default settings
        const newObjectNodes = objectNodes.filter(n => !existingSettingsIds.has(n.id));
        const newObjectSettings: SceneObjectSettings[] = newObjectNodes.map(node => ({
            nodeId: node.id,
            scale: 1.0,
            rotation: 'front',
        }));
        
        setSettings({
            ...baseSettings,
            objects: [...existingSettings, ...newObjectSettings]
        });
    } else {
        setSettings(null); // Clear settings when modal is closed
    }
  }, [isOpen, sceneNode, objectNodes]); // Rerunning this logic if objectNodes changes is intended to refresh the list

  // Guard clause: If the modal is not open or settings are not yet initialized, render nothing.
  if (!isOpen || !settings) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (settings) {
      onSubmit(settings);
    }
  };

  const handleObjectChange = (nodeId: string, prop: keyof SceneObjectSettings, value: any) => {
    setSettings(prev => {
        if (!prev) return null;
        return {
            ...prev,
            objects: prev.objects.map(obj => obj.nodeId === nodeId ? { ...obj, [prop]: value } : obj)
        };
    });
  }
  
  const handleGlobalChange = (prop: keyof SceneSettings, value: any) => {
      setSettings(prev => prev ? ({ ...prev, [prop as any]: value }) : null);
  }

  const rotationOptions: SceneObjectSettings['rotation'][] = ['front', 'left', 'right', 'back'];
  const rotationLabels: { [key in SceneObjectSettings['rotation']]: string } = {
      front: 'Frente',
      left: 'Esquerda',
      right: 'Direita',
      back: 'Trás'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity">
      <form onSubmit={handleSubmit} className="bg-gray-800 text-white p-6 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700 relative flex flex-col max-h-[90vh]">
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
          <CloseIcon className="w-6 h-6" />
        </button>
        
        <div className="flex items-center mb-4">
          <CubeIcon className="w-6 h-6 mr-3 text-teal-400" />
          <h2 className="text-2xl font-bold">Definições de Renderização de Cena</h2>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2">
            {/* --- Global Settings --- */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                    <label htmlFor="cameraElevation" className="block mb-2 font-semibold text-gray-300">Elevação da Câmara</label>
                    <select id="cameraElevation" value={settings.cameraElevation} onChange={e => handleGlobalChange('cameraElevation', e.target.value)} className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500">
                        <option value="eye-level">Vista ao Nível dos Olhos</option>
                        <option value="low-angle">Vista de Ângulo Baixo</option>
                        <option value="high-angle">Vista de Ângulo Alto</option>
                        <option value="top-down">Vista de Cima (Drone)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="renderStyle" className="block mb-2 font-semibold text-gray-300">Estilo de Renderização</label>
                    <select id="renderStyle" value={settings.renderStyle} onChange={e => handleGlobalChange('renderStyle', e.target.value)} className="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded-md focus:ring-2 focus:ring-teal-500">
                        <option value="photorealistic-day">Fotorrealista (Dia)</option>
                        <option value="photorealistic-night">Fotorrealista (Noite)</option>
                        <option value="architectural-sketch">Esboço Arquitetónico</option>
                        <option value="clay-model">Modelo de Argila</option>
                    </select>
                </div>
            </div>

            {/* --- Object List --- */}
            <h3 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">Objetos da Cena</h3>
            <div className="space-y-4">
                {settings.objects.length > 0 ? settings.objects.map(objSetting => {
                    const objNode = objectNodes.find(n => n.id === objSetting.nodeId);
                    if (!objNode) return null;
                    return (
                        <div key={objNode.id} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-lg">
                            <img src={objNode.image?.src || objNode.output?.image?.src} alt={`Object ${objNode.id}`} className="w-14 h-14 object-cover rounded-md border-2 border-gray-600 flex-shrink-0"/>
                            <div className="flex-grow grid grid-cols-2 gap-4 items-center">
                                <div>
                                    <label htmlFor={`scale-${objNode.id}`} className="block text-sm font-medium text-gray-400 mb-1">Escala: {Math.round(objSetting.scale * 100)}%</label>
                                    <input type="range" id={`scale-${objNode.id}`} min="0.5" max="2.0" step="0.05" value={objSetting.scale} onChange={e => handleObjectChange(objNode.id, 'scale', parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Rotação</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const currentIndex = rotationOptions.indexOf(objSetting.rotation);
                                                const nextIndex = (currentIndex + 1) % rotationOptions.length;
                                                handleObjectChange(objNode.id, 'rotation', rotationOptions[nextIndex]);
                                            }}
                                            className="p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                                            title="Rodar Objeto"
                                        >
                                            <RotateCwIcon className="w-5 h-5" />
                                        </button>
                                        <span className="p-2 bg-gray-900 text-sm text-white rounded-md w-full text-center capitalize">
                                            {rotationLabels[objSetting.rotation]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }) : <p className="text-sm text-gray-500 text-center py-4">Conecte nós de objeto ao nó de Cena para configurá-los aqui.</p>}
            </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-700 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-md transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md transition-colors">
            Guardar e Fechar
          </button>
        </div>
      </form>
    </div>
  );
};

export default SceneSettingsModal;