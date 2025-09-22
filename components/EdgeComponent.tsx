import React from 'react';
import { Point } from '../types';

interface EdgeComponentProps {
  startPos: Point;
  endPos: Point;
  id: string;
  color?: string;
  strokeWidth?: number;
  isAnimated?: boolean;
}

const EdgeComponent: React.FC<EdgeComponentProps> = ({ startPos, endPos, id, color, strokeWidth, isAnimated }) => {
  const dx = endPos.x - startPos.x;
  const controlPointX1 = startPos.x + dx * 0.5;
  const controlPointX2 = endPos.x - dx * 0.5;

  const d = `M ${startPos.x} ${startPos.y} C ${controlPointX1} ${startPos.y}, ${controlPointX2} ${endPos.y}, ${endPos.x} ${endPos.y}`;
  
  const finalColor = color || '#818cf8'; // Default indigo-400
  const finalStrokeWidth = strokeWidth || 2.5;
  const groupClassName = isAnimated ? 'edge-animated' : '';

  return (
    <g className={groupClassName}>
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="10"
          markerHeight="7"
          refX="8.5"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill={finalColor} />
        </marker>
      </defs>
      <path
        d={d}
        stroke={finalColor}
        strokeWidth={finalStrokeWidth}
        fill="none"
        markerEnd={`url(#arrowhead-${id})`}
        style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.3))' }}
      />
    </g>
  );
};

export default EdgeComponent;