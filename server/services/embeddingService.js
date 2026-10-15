import crypto from 'crypto'
import { getGeminiClient } from './geminiClient'

const VECTOR_DIMENSION = 768;

// deterministic sematic  vectorizer fallback for local search 
function generateLocalEmbedding(text, dimension = VECTOR_DIMENSION) {
    if (!text || typeof text != 'string') {
        return new Array(dimension).fill(0);
    }

    const vector = new Float64Array(dimension);
    const token = text.toLowerCase().match(/[a-zA-Z0-9_$]+|[^\s\w]/g) || [];


    const keywords = new Set([
        'function', 'class', 'import', 'export', 'return', 'async', 'await',
        'auth', 'token', 'user', 'password', 'login', 'db', 'database',
        'route', 'router', 'get', 'post', 'put', 'delete', 'model', 'schema',
        'error', 'catch', 'throw', 'config', 'service', 'controller'
    ]);



}