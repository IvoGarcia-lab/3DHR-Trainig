import React from 'react';
import { Point } from '../types';
import { CameraIcon } from './icons';

interface ViewpointWidgetProps {
  cameraPos: Point;
  targetPos: Point;
  onMouseDown: (e: React.MouseEvent, handle: 'camera' | 'target') => void;
}

const ViewpointWidget: React.FC<ViewpointWidgetProps> = ({ cameraPos, targetPos, onMouseDown }) => {
  return (
    <>
      {/* Line connecting camera and target */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line
          x1={cameraPos.x}
          y1={cameraPos.y}
          x2={targetPos.x}
          y2={targetPos.y}
          stroke="cyan"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      </svg>
      
      {/* Camera Handle */}
      <div
        className="absolute w-10 h-10 bg-gray-800 border-2 border-cyan-400 rounded-full flex items-center justify-center cursor-move"
        style={{ left: cameraPos.x - 20, top: cameraPos.y - 20, zIndex: 100 }}
        onMouseDown={(e) => onMouseDown(e, 'camera')}
      >
        <CameraIcon className="w-5 h-5 text-cyan-400" />
      </div>

      {/* Target Handle */}
      <div
        className="absolute w-6 h-6 bg-gray-800 border-2 border-cyan-400 rounded-full cursor-move"
        style={{ left: targetPos.x - 12, top: targetPos.y - 12, zIndex: 100 }}
        onMouseDown={(e) => onMouseDown(e, 'target')}
      >
        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
      </div>
    </>
  );
};

export default ViewpointWidget;