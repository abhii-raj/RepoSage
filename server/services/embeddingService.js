import crypto from 'crypto'
import { getGeminiClient } from './geminiClient'

const VECTOR_DIMENSION = 768;

// deterministic sematic  vectorizer fallback for local search 
function generateLocalEmbedding(text, dimension = VECTOR_DIMENSION) {
    if (!text || typeof text != 'string') {
        return new Array(dimension).fill(0);
    }

    const vector = new Float64Array(dimension);
    const tokens = text.toLowerCase().match(/[a-zA-Z0-9_$]+|[^\s\w]/g) || [];


    const keywords = new Set([
        'function', 'class', 'import', 'export', 'return', 'async', 'await',
        'auth', 'token', 'user', 'password', 'login', 'db', 'database',
        'route', 'router', 'get', 'post', 'put', 'delete', 'model', 'schema',
        'error', 'catch', 'throw', 'config', 'service', 'controller'
    ]);

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const weight = keywords.has(token) ? 2.5 : 1.0;
        const hash = crypto.createHash('md5').update(token).digest();

        for (let j = 0; j < 8; j++) {
            const idx = hash.readUInt16BE(j * 2) % dimension;
            const sign = (hash[j] % 2 === 0) ? 1 : -1;
            vector[idx] += sign * weight;
        }

        if (i < tokens.length - 1) {
            const bigram = `${token}_${tokens[i + 1]}`;
            const biHash = crypto.createHash('sha1').update(bigram).digest();
            const biIdx = biHash.readUInt16BE(0) % dimension;
            vector[biIdx] += 1.2;
        }
    }

    let norm = 0;
    for (let i = 0; i < dimension; i++) {
        norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
        for (let i = 0; i < dimension; i++) {
            vector[i] /= norm;
        }
    }

    return Array.from(vector);

}

async function generateGeminiEmbedding(textOrDoc, apiKey) {
    const client = getGeminiClient(apiKey);
    if (!client) {
        throw new Error('Gemini Api key is not configured');
    }

    const doc = typeof textOrDoc === 'string' ? textOrDoc.slice(0, 8000) : textOrDoc;
    const primaryModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-05';

    try {
        const response = await client.models.embedContent({
            model: primaryModel,
            contents: doc,
            config: { outputDimensionality: VECTOR_DIMENSION }
        });

        const values = response.embedding?.values || response.embeddings?.[0].values;
        if (values && Array.isArray(values)) return values;

    } catch {
        const fallbackModels = ['text-embedding-004', 'gemini-embedding-001'].filter(m => m !== primaryModel);
        for (const altModel of fallbackModels) {
            try {
                const altResponse = await client.models.embedContent({
                    model: altModel,
                    contents: doc,
                    config: { outputDimensionality: VECTOR_DIMENSION }
                });

                const altValues = altResponse.embedding?.values || altResponse.embeddings?.[0].values;
                if (altValues && Array.isArray(altValues)) return altValues;

            } catch (e) {
                //try next
            }
        }
        throw primaryErr;
    }
    throw new Error("No Embedding values returned from Gemini API");

}

/// how embediing is used  , fallback mechanism to local 
async function createEmbedding(text, customApiKey = null) {
    const geminiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (geminiKey) {
        try {
            return await generateGeminiEmbedding(text, geminiKey);
        } catch (err) {
            console.warn(`[Embedding] Gemini failed   (${err.message}). Using local deterministic sematic vectorizer`);
        }
    }


    return generateLocalEmbedding(text, VECTOR_DIMENSION);
}

function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length != vecB.length) return 0;
    let dotProduct = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
    }
    return dotProduct;
}

export {
    VECTOR_DIMENSION,
    createEmbedding,
    generateGeminiEmbedding,
    generateLocalEmbedding,
    cosineSimilarity
};






