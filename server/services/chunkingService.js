import { text } from "express";

const CONTROL_KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'switch', 'case', 'catch', 'finally',
    'do', 'with', 'return', 'new', 'try', 'throw'
]);

// Patterns to identify top-level code boundaries and symbols
const SYMBOL_PATTERNS = {
    javascript: [
        { regex: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*([a-zA-Z0-9_$]+)\s*\(/, type: 'function' },
        { regex: /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/, type: 'arrow-function' },
        { regex: /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?function/, type: 'function' },
        { regex: /^(?:export\s+)?(?:default\s+)?class\s+([a-zA-Z0-9_$]+)/, type: 'class' }
    ],
    typescript: [
        { regex: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*([a-zA-Z0-9_$]+)/, type: 'function' },
        { regex: /^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/, type: 'arrow-function' },
        { regex: /^(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)/, type: 'class' },
        { regex: /^(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/, type: 'interface' },
        { regex: /^(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/, type: 'type' }
    ],
    python: [
        { regex: /^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(/, type: 'function' },
        { regex: /^class\s+([a-zA-Z0-9_]+)/, type: 'class' }
    ],
    go: [
        { regex: /^func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(/, type: 'function' },
        { regex: /^type\s+([a-zA-Z0-9_]+)\s+struct/, type: 'struct' },
        { regex: /^type\s+([a-zA-Z0-9_]+)\s+interface/, type: 'interface' }
    ],
    markdown: [
        { regex: /^(#{1,3})\s+(.+)$/, type: 'header' }
    ]
};


function extractLanguageSymbols(lines, language) {
    const patterns = SYMBOL_PATTERNS[language] || SYMBOL_PATTERNS.javascript;
    const boundaries = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        for (const pat of patterns) {
            const match = line.match(pat.regex);
            if (match) {
                const name = match[1] || match[2] || 'anonymous';
                if (!CONTROL_KEYWORDS.has(name)) {
                    boundaries.push({
                        lineIdx: i,
                        name,
                        type: pat.type
                    })
                    break;
                }
            }
        }
    }
    return boundaries;
}





function findBlockEndLine(lines, startIdx) {
    let openBraces = 0;
    let hasOpened = false;
    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            if (ch === '{') {
                openBraces++;
                hasOpened = true;
            } else if (ch === '}') {
                openBraces--;
            }
        }
        if (hasOpened && openBraces <= 0) {
            return i + 1;
        }
    }

    return lines.length;
}


function chunkCode(content, filePath, language = 'javascript') {
    // exclude images , pdfs , media
    // find the language 
    // if no symbol , fall back to block chunk 
    // import chunks ig... 
    const extension = /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|bmp|tiff|pdf|zip|tar|gz|7z|rar|exe|dll|so|dylib|wasm|woff|woff2|ttf|eot|otf|mp4|webm|avi|mov|mkv|mp3|wav|ogg|flac|aac|dmg|iso|bin|dat|db|sqlite|class|pyc|jar|lock)$/i;


    if (extension.test(filePath || '') || language === "image" || language === "binary") {
        return [];
    }

    if (content.includes('\0')) {
        return [];
    }

    const lines = content.split('\n');
    if (lines.length === 0) return [];

    const boundaries = extractLanguageSymbols(lines, language);
    const chunks = [];
    // no symbol found 
    if (boundaries.length === 0) {
        if (lines.length < 40) {
            return [{
                filePath,
                startLine: 1,
                endLine: lines.length,
                functionName: 'entireFile',
                chunkType: 'File',
                language,
                text: content
            }]
        }


        const CHUNK_LINE_SIZE = 50;
        const overlap = 8;
        for (let i = 0; i < lines.length; i += (CHUNK_LINE_SIZE - overlap)) {
            const slice = lines.slice(i, i + CHUNK_LINE_SIZE);
            chunks.push({
                filePath,
                startLine: i + 1,
                endLine: Math.min(lines.length, i + CHUNK_LINE_SIZE),
                functionName: `block_L${i + 1}`,
                chunkType: 'block',
                language,
                text: slice.join('\n')
            })
            if (i + CHUNK_LINE_SIZE >= lines.length) break;
        }
        return chunks;

    }


    // import chunks 
    if (boundaries[0].lineIdx > 0) {
        const headerLines = lines.slice(0, boundaries[0].lineIdx);
        if (headerLines.some(l => l.trim().length > 0)) {
            chunks.push({
                filePath,
                startLine: 1,
                endLine: boundaries[0].lineIdx,
                functionName: 'imports and declarations',
                chunkType: 'header',
                language,
                text: headerLines.join('\n')
            })
        }

    }


    // symbol aware chunks 
    for (let b = 0; b < boundaries.length; b++) {
        const curr = boundaries[b];
        const next = boundaries[b + 1];

        let start = curr.lineIdx;
        let end = findBlockEndLine(lines, start);


        if (next && next.lineIdx < end && next.lineIdx > start) {
            end = next.lineIdx;
        }

        const chunkLines = lines.slice(start, end);
        chunks.push({
            filePath,
            startLine: start + 1,
            endLine: end,
            functionName: curr.name,
            chunkType: curr.type,
            language,
            text: chunkLines.join('\n')
        })
    }

    return chunks;
}



function naiveChunkCode(content, filePath, charSize = 500) {
    if (!content) return [];
    const chunks = [];
    for (let i = 0; i < content.length; i++) {
        const slice = content.slice(i, i + charSize);
        const startLine = content.slice(0, i).split('\n').length;
        const endLine = content.slice(0, i + charSize).split('\n').length;
        chunks.push({
            filePath,
            startLine,
            endLine,
            functionName: 'naive_slice',
            chunkType: 'naive',
            language: 'text',
            text: slice
        })
    }

    return chunks
}


export { naiveChunkCode, chunkCode, extractLanguageSymbols };

































