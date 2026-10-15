import { GoogleGenAI } from "@google/genai";

const clientCache = new Map();

function getGeminiClient(customApiKey = null) {
    const apiKey = (customApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
    if (!apiKey) {
        return null;
    }
    if (clientCache.has(apiKey)) {
        return clientCache.get(apiKey);
    }

    const client = new GoogleGenAI({ apiKey });
    clientCache.set(apiKey, client);

    return client;
}

export { getGeminiClient };