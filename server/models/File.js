import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    repoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true },
    path: { type: String, required: true },
    name: { type: String, required: true },
    extention: { type: String, default: " " },
    size: { type: Number, required: true },
    sha: { type: String },
    language: { type: String, default: "text" },
    isIndexable: { type: Boolean, default: true },
    isIndexed: { type: Boolean, default: false },
    chunkCount: { type: Number, default: 0 },
    content: { type: String, default: " " },
}, { timestamps: true });

fileSchema.index({ repoId: 1, path: 1 }, { unique: true });

const File = mongoose.model.File || mongoose.model("File", fileSchema);

export default File;