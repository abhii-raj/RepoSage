const LANGUAGE_EXT_MAP = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp', php: 'php',
    html: 'html', css: 'css', scss: 'scss', json: 'json', md: 'markdown',
    yaml: 'yaml', yml: 'yaml', sh: 'bash', sql: 'sql',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image',
    ico: 'image', webp: 'image', avif: 'image', bmp: 'image', tiff: 'image'
};

const IGNORED_FILE_PATTERNS = [
    /(^|\/)\.git\//i,
    /(^|\/)node_modules\//i,
    /(^|\/)vendor\//i,
    /(^|\/)dist\//i,
    /(^|\/)build\//i,
    /(^|\/)\.next\//i,
    /(^|\/)\.cache\//i,
    /(^|\/)coverage\//i,
    /package-lock\.json$/i,
    /yarn\.lock$/i,
    /pnpm-lock\.yaml$/i,
    /bun\.lockb?$/i,
    /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|bmp|tiff|pdf|zip|tar|gz|7z|rar|exe|dll|so|dylib|wasm|woff|woff2|ttf|eot|otf|mp4|webm|avi|mov|mkv|mp3|wav|ogg|flac|aac|dmg|iso|bin|dat|db|sqlite|class|pyc|jar|lock)$/i
];

function detectLanguage(filePath) {
    const ext = filePath.split('.').pop().toLowerCase();
    return LANGUAGE_EXT_MAP[ext] || 'text';
}

function shouldIndexFile(path, size) {
    if (IGNORED_FILE_PATTERNS.some(p => p.test(path))) return false;
    if (size && size > 500 * 1024) return false;
    return true;
}

module.exports = {
    detectLanguage,
    shouldIndexFile
};
