import RepoModel from './Repo'
import FileModel from './File'
import ChunkModel from './Chunk'
import ConversationModel from './Conversation'
import { memoryDB } from '../config/db'
import { isMongooseConnected, matchDoc, createBaseAdapter } from './memoryHelper'

const Repo = createBaseAdapter(RepoModel, () => memoryDB.repos);
const File = createBaseAdapter(FileModel, () => memoryDB.files);

const baseChunk = createBaseAdapter(ChunkModel, () => memoryDB.chunks);

const Chunk = {
    ...baseChunk,
    async countDocuments(query = {}) {
        if (isMongooseConnected()) return await ChunkModel.countDocuments(query);
        return Array.from(memoryDB.chunks.values()).filter(d => matchDoc(d, query)).length;
    },
    async aggregate(pipeline) {
        if (isMongooseConnected()) {
            try {
                return await ChunkModel.aggregate(pipeline);
            } catch (e) {
                console.warn('[chunk aggregate] vector search fallback to memory');
            }
        }
        return null;
    }
}


const Conversation = createBaseAdapter(ConversationModel, () => memoryDB.conversation);

export { Repo, File, Chunk, Conversation, isMongooseConnected };