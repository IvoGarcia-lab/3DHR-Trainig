import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";
import { SceneSettings, NodeData, NodeOutput } from '../types';

const apiKey = process.env.API_KEY;

if (!apiKey || apiKey === "undefined") {
    // Isto fornece uma mensagem de erro mais útil ao utilizador se a variável de ambiente não estiver definida.
    throw new Error("A chave da API não foi configurada. Verifique se a variável de ambiente VITE_API_KEY está definida nas configurações do seu projeto na Vercel e faça um novo 'deploy'. O valor não deve estar em falta.");
}

const ai = new GoogleGenAI({ apiKey });

// Utility to convert a base64 data URL to a GenerativePart
const fileToGenerativePart = (fileSrc: string, mimeType: string) => {
    return {
        inlineData: {
            data: fileSrc.split(',')[1],
            mimeType,
        },
    };
};

// A helper for models that output images, to extract the first image
const extractOutputImage = (response: GenerateContentResponse): NodeOutput => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            return {
                image: {
                    src: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                    mimeType: part.inlineData.mimeType,
                }
            };
        }
    }
    // The model can also return text, for example, explaining why it couldn't generate an image.
    if (response.text) {
        return { text: response.text };
    }
    throw new Error("Nenhuma imagem foi gerada pelo modelo.");
}

export const generateImageFromText = async (prompt: string): Promise<NodeOutput> => {
    if (!prompt || prompt.trim() === '') {
        throw new Error("É necessária uma instrução para gerar uma imagem.");
    }
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return {
            image: {
                src: `data:image/png;base64,${base64ImageBytes}`,
                mimeType: 'image/png',
            }
        };
    }
    
    throw new Error("A geração de imagem falhou em retornar uma imagem.");
}

export const analyzeImage = async (prompt: string, imageSrc: string, imageMimeType: string): Promise<string> => {
    const imagePart = fileToGenerativePart(imageSrc, imageMimeType);
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });
    return response.text;
};

export const enhancePrompt = async (originalText: string, instruction: string): Promise<string> => {
    if (!originalText || !instruction) {
        throw new Error("São necessários o texto original e uma instrução de modificação.");
    }

    const prompt = `A sua tarefa é refinar um texto para ser usado como uma instrução para uma IA de geração de imagens.
    
Texto Original: "${originalText}"

Instrução de Refinamento: "${instruction}"

Com base na instrução, reescreva o texto original. Produza APENAS o texto refinado final.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
    });

    return response.text;
};

export const extractStyle = async (imageSrc: string, imageMimeType: string, intensity: number = 1.0): Promise<string> => {
    const imagePart = fileToGenerativePart(imageSrc, imageMimeType);
    
    if (intensity === 0) {
        return ""; // Return empty string for 0% influence
    }

    const prompt = `A sua tarefa é atuar como um diretor de arte especialista. A sua meta é criar um prefixo de instrução que capture a **essência estilística e estrutural** da imagem fornecida, mas que seja **completamente agnóstico em relação ao assunto**. O objetivo é que esta instrução possa ser usada para aplicar o estilo a um assunto totalmente novo e não relacionado.

**Instruções Cruciais:**
1.  **Analise a Estrutura e Composição:** Identifique o layout fundamental. É um infográfico radial? Um projeto técnico com vistas explodidas? Uma composição fotográfica com uma profundidade de campo específica? Descreva esta ESTRUTURA.
2.  **Analise a Estética Visual:** Descreva a paleta de cores, a iluminação, a textura (ex: gravura, aguarela, grão de filme), o estilo das linhas e o humor geral.
3.  **SEJA AGNÓSTICO AO ASSUNTO:** Esta é a regra mais importante. **NÃO mencione os objetos ou seres vivos específicos** na imagem de referência. Se vir um infográfico de insetos, descreva a estrutura de um "infográfico científico circular com segmentos rotulados" e o estilo de "gravura vintage", mas NÃO mencione os "insetos". Se vir uma foto de um carro, descreva o "estilo cinematográfico com iluminação de néon" e não o "carro".
4.  **Combine numa Instrução Coesa:** Junte a sua análise estrutural e estética numa única e poderosa frase de instrução. A sua saída deve ser uma diretiva clara para uma IA de imagem sobre COMO criar algo, não O QUÊ criar.
5.  **Verificação Final:** Antes de gerar a saída, reveja a sua instrução. Se ela mencionar qualquer objeto ou assunto específico da imagem de referência, reescreva-a para ser puramente abstrata e estilística.

**Modulação de Intensidade (${Math.round(intensity * 100)}%):**
*   **100%:** Uma descrição extremamente detalhada da estrutura e da estética, quase uma receita para recriar o estilo.
*   **50%:** Capture os elementos estruturais e estéticos mais proeminentes.
*   **10%:** Foque-se no aspeto mais definidor, seja a estrutura ("Num layout de diagrama...") ou a estética ("Com uma estética de gravura vintage...").
*   **0%:** A saída deve ser uma string vazia.

Produza APENAS a frase de instrução final. Não inclua os seus passos de análise ou qualquer outro texto.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, imagePart] },
    });
    return response.text;
};

export const suggestPrompts = async (images: {src: string, mimeType: string}[], context: string = ''): Promise<string[]> => {
    const imageParts = images.map(img => fileToGenerativePart(img.src, img.mimeType));
    
    let prompt: string;
    if (context && context.trim() !== '') {
        prompt = `Você é um assistente de IA a ajudar a construir uma instrução para geração de imagens. Recebeu um contexto existente de descrições de estilo e assunto: "${context}".
Com base neste contexto E na(s) imagem(s) fornecida(s), sugira 3 instruções criativas que desenvolvam, refinem ou completem a ideia. As sugestões devem ser adições curtas ao contexto existente, não substituições completas.`;
    } else {
        prompt = `Com base na(s) imagem(s) fornecida(s), sugira 3 instruções distintas, criativas e detalhadas que poderiam ser usadas para gerar uma imagem nova e interessante. As instruções devem ser adequadas para uma IA de geração de imagens.`;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }, ...imageParts] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    prompts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                            description: "Uma instrução criativa para a geração de imagens."
                        }
                    }
                }
            }
        }
    });
    
    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return Array.isArray(result.prompts) ? result.prompts : [];
    } catch (e) {
        console.error("Falha ao analisar as sugestões de instruções:", e);
        // Fallback: Tenta analisar como uma lista simples se o esquema falhar
        try {
            const suggestions = JSON.parse(response.text.trim());
            if (Array.isArray(suggestions)) return suggestions;
        } catch {}
        return [];
    }
};

export const suggestTextVariations = async (text: string): Promise<string[]> => {
    const prompt = `Você é um assistente de escrita criativa. Com base no seguinte texto, gere 3 variações distintas e aprimoradas. Cada variação deve explorar um ângulo, tom ou nível de detalhe diferente, mas manter a intenção principal do texto original. As variações devem ser prontas para serem usadas como instruções para uma IA de geração de imagem.

Texto Original: "${text}"

Gere as 3 variações.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    variations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.STRING,
                            description: "Uma variação criativa do texto original."
                        }
                    }
                }
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        return Array.isArray(result.variations) ? result.variations : [];
    } catch (e) {
        console.error("Falha ao analisar as variações de texto:", e);
        return [];
    }
};


export const combineImages = async (prompt: string, images: {src: string, mimeType: string}[]): Promise<NodeOutput> => {
    const imageParts = images.map(img => fileToGenerativePart(img.src, img.mimeType));

    // Fix: Re-structured content parts creation to resolve a TypeScript type inference error.
    // By conditionally creating the `parts` array inline, TypeScript correctly infers
    // a union type, allowing both text and image parts.
    const contentParts = (prompt && prompt.trim() !== '')
        ? [{ text: prompt }, ...imageParts]
        : imageParts;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-image',
        contents: { parts: contentParts },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        }
    });

    return extractOutputImage(response);
};

export const refineImage = async (prompt: string, image: {src: string, mimeType: string}, mask: {src: string, mimeType: string}): Promise<NodeOutput> => {
    const imagePart = fileToGenerativePart(image.src, image.mimeType);
    const maskPart = fileToGenerativePart(mask.src, mask.mimeType);

    const textPart = { text: `Instruções: ${prompt}. Edite a imagem original, aplicando alterações APENAS às áreas não pretas da máscara fornecida.` };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-image',
        contents: {
            parts: [
                textPart,
                imagePart,
                maskPart, // Provide the mask as another part
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    return extractOutputImage(response);
};

export const renderScene = async (settings: SceneSettings, objectNodes: NodeData[]): Promise<NodeOutput> => {
    const promptParts: string[] = [];
    promptParts.push(`Gere uma cena única e coerente com um estilo artístico "${settings.renderStyle}".`);
    promptParts.push(`O ponto de vista da câmara é de um "${settings.cameraElevation}".`);

    const imageParts = [];
    
    if (settings.objects.length > 0) {
        promptParts.push("\nA cena contém os seguintes objetos:");
        for (const obj of settings.objects) {
            const node = objectNodes.find(n => n.id === obj.nodeId);
            const image = node?.output?.image || node?.image;
            if (node && image) {
                promptParts.push(`- Um "${node.label}" (ver imagem fornecida). Deve ser dimensionado para aproximadamente ${obj.scale * 100}% do seu tamanho natural e a sua rotação está virada para "${obj.rotation}".`);
                imageParts.push(fileToGenerativePart(image.src, image.mimeType));
            }
        }
    } else {
        promptParts.push("A cena está atualmente vazia. Gere uma cena vazia interessante com base no estilo e ângulo da câmara.");
    }

    const fullPrompt = promptParts.join(' ');

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-image',
        contents: { parts: [{ text: fullPrompt }, ...imageParts] },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        }
    });

    return extractOutputImage(response);
};