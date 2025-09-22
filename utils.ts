// Fix: Imported Point from types.ts to resolve circular dependency.
import { NodeData, Edge, Point } from './types';

export const getConnectorPosition = (node: NodeData, connectorId: string | number, type: 'in' | 'out', allEdges: Edge[], index: number = 0, totalConnectors: number = 1): Point => {
    const headerHeight = 40; // Approx height of the header
    const nodeBodyHeight = node.height - headerHeight;

    if (type === 'out') {
        const verticalPosition = (nodeBodyHeight / (totalConnectors + 1)) * (index + 1);
        return {
            x: node.position.x + node.width,
            y: node.position.y + headerHeight + verticalPosition
        }
    }

    // Handle inputs
    if (connectorId === 'prompt' || connectorId === 'text') {
        return {
            x: node.position.x + node.width / 2,
            y: node.position.y
        }
    }

    // Handle image inputs
    const imageInputConnectors: (string|number)[] = [];
    if (node.type === 'COMBINE') {
        const connectedInputs = allEdges.filter(e => e.toNode === node.id && typeof e.toConnector === 'number').length;
        for (let i = 0; i < connectedInputs + 1; i++) {
            imageInputConnectors.push(i);
        }
    } else if (node.type === 'ANALYZE' || node.type === 'STYLE_EXTRACTOR' || node.type === 'DETAIL') {
        imageInputConnectors.push(0);
    } else if (node.type === 'SCENE') {
         const connectedSceneInputs = allEdges.filter(e => e.toNode === node.id).length;
        for (let i = 0; i < connectedSceneInputs + 1; i++) {
            imageInputConnectors.push(i);
        }
    }
    
    const inputIndex = imageInputConnectors.indexOf(connectorId as number);
    if (inputIndex === -1) { // Fallback for safety, though it shouldn't happen with correct logic in NodeComponent
        return { x: node.position.x, y: node.position.y + node.height / 2 };
    }

    const totalInputConnectors = imageInputConnectors.length;
    const verticalPosition = (nodeBodyHeight / (totalInputConnectors + 1)) * (inputIndex + 1);
    
    return {
        x: node.position.x,
        y: node.position.y + headerHeight + verticalPosition
    }
};

export const isPointInNode = (point: Point, node: NodeData): boolean => {
    return (
        point.x >= node.position.x &&
        point.x <= node.position.x + node.width &&
        point.y >= node.position.y &&
        point.y <= node.position.y + node.height
    );
};