const { Repo, File, Chunk } = require('../models/dbAdapter');

const DEMO_REPO_INFO = {
    owner: 'reposage',
    name: 'nexus-auth-microservice',
    fullName: 'reposage/nexus-auth-microservice',
    url: 'https://github.com/reposage/nexus-auth-microservice',
    defaultBranch: 'main',
    commitSha: 'a1b2c3d4e5f6',
    totalFiles: 5,
    status: 'idle',
    progress: 0,
    statusMessage: 'Ready for demonstration indexing',
    languageBreakdown: { javascript: 4, markdown: 1 }
};

const DEMO_FILES = [
    {
        path: 'src/services/authService.js',
        name: 'authService.js',
        extension: 'js',
        language: 'javascript',
        content: `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-super-secret-key';

async function authenticateUser(email, password, userDb) {
  if (!email || !password) {
    throw new Error('Missing email or password credentials');
  }
  const user = await userDb.findByEmail(email);
  if (!user) {
    throw new Error('User not found');
  }
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new Error('Invalid credentials provided');
  }
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Token expired or invalid: ' + err.message);
  }
}

module.exports = { authenticateUser, verifyAuthToken };`
    },
    {
        path: 'src/middleware/authGuard.js',
        name: 'authGuard.js',
        extension: 'js',
        language: 'javascript',
        content: `const { verifyAuthToken } = require('../services/authService');

function authGuard(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAuthToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Forbidden: ' + err.message });
  }
}

module.exports = { authGuard };`
    },
    {
        path: 'src/controllers/userController.js',
        name: 'userController.js',
        extension: 'js',
        language: 'javascript',
        content: `const { authenticateUser } = require('../services/authService');

async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser(email, password, req.app.locals.userDb);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

async function handleGetProfile(req, res) {
  res.json({ user: req.user, status: 'active' });
}

module.exports = { handleLogin, handleGetProfile };`
    },
    {
        path: 'src/config/database.js',
        name: 'database.js',
        extension: 'js',
        language: 'javascript',
        content: `const { MongoClient } = require('mongodb');

let client;
async function initDatabase(connectionString) {
  client = new MongoClient(connectionString);
  await client.connect();
  console.log('Connected to Nexus Mongo cluster');
  return client.db('nexus_prod');
}

module.exports = { initDatabase };`
    },
    {
        path: 'README.md',
        name: 'README.md',
        extension: 'md',
        language: 'markdown',
        content: `# Nexus Auth Microservice
Handles user authentication, token issuance with JWT, and route access guards.
Designed with Express, MongoDB, and JSON Web Tokens.`
    }
];

async function seedDemoRepo() {
    let repo = await Repo.findOne({ fullName: DEMO_REPO_INFO.fullName });
    if (!repo) {
        repo = await Repo.create(DEMO_REPO_INFO);
    }

    await File.deleteMany({ repoId: repo._id });
    await Chunk.deleteMany({ repoId: repo._id });

    const createdFiles = [];
    for (const df of DEMO_FILES) {
        const f = await File.create({
            repoId: repo._id,
            path: df.path,
            name: df.name,
            extension: df.extension,
            size: Buffer.byteLength(df.content),
            language: df.language,
            content: df.content,
            isIndexable: true,
            isIndexed: false,
            chunkCount: 0
        });
        createdFiles.push(f);
    }

    return { repo, files: createdFiles };
}

module.exports = {
    DEMO_REPO_INFO,
    DEMO_FILES,
    seedDemoRepo
};
