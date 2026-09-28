import mongoose from "mongoose";

const repoSchema = new mongoose.Schema({
    owner: { type: String, required: true },
    name: { type: String, required: true },
    fullname: { type: String, required: true, unique: true },
    url: { type: String, required: true },
    defaultBranch: { type: String, required: true },
    commitSha: { type: String },
    status: {
        type: String,
        enum: ["idle", "indexing", "indexed", "failed"],
        default: "idle"
    },
    progress: { type: Number, default: 0 },
    statusMessage: { type: String, default: 'Ready' },
    totalFiles: { type: Number, default: 0 },
    indexedFiles: { type: Number, default: 0 },
    tokenChunks: { type: Number, default: 0 },
    languageBreakdown: { type: Map, of: Number, default: {} },
    lastIndexedAt: { type: Date }
}, { timestamps: true });


const repo = mongoose.models.Repo || mongoose.model('Repo', repoSchema);
export default repo