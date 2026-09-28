import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    repoId: { type: mongoose.Schema.Types.ObjectId, ref: 'repo', required: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File ' },
    filePath: { type: String, required: true, index: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    functionName: { type: String, default: " " },
    chunkType: { type: String, default: "block" },
    language: { type: String, default: "text " },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    tokenCount: { type: Number, default: 0 },
}, { timestamps: true });

const Chunk = mongoose.model.Chunk || mongoose.model("Chunk", chunkSchema);

export default Chunk;