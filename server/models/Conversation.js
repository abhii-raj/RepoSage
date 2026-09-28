import mongoose from "mongoose";

// citation Schema , agentStepSchema , messageSchema , conversationSchema , 
const citationSchema = new mongoose.Schema({
    filePath: String,
    startLine: Number,
    endLine: Number,
    functionName: String,
    snippet: String,
    score: Number
}, { _id: false })

const agentStepSchema = new mongoose.Schema({
    stepNumber: Number,
    thought: String,
    toolName: String,
    toolInput: mongoose.Schema.Types.Mixed,
    toolOutput: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
}, { _id: false })

const messageSchema = new mongoose.Schema({
    id: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant', 'system', 'tool'], required: true },
    content: { type: String, required: true },
    citations: [citationSchema],
    agentSteps: [agentStepSchema],
    timestamp: { type: Date, default: Date.now }
}, { _id: false });



const conversationSchema = new mongoose.Schema({
    repoId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, default: 'New Conversation' },
    mode: { type: String, enum: ['rag', 'agent'], default: 'rag' },
    messages: [messageSchema],
}, { timeStamps: true });


const Conversation = mongoose.model.Conversation || mongoose.model("Conversation", conversationSchema);

export default Conversation;