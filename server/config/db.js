import mongoose from "mongoose";

let dbmode = "memory";
let isconnected = false;

const memoryDB = {
    repos: new Map(),
    files: new Map(),
    chunks: new Map(),
    conversation: new Map()
}

async function connectDB() {
    let mongoUri = process.env.MONGODB_URI;
    try {

        await mongoose.connect(mongoUri);
        console.log("runing in mongo mode");
        return { isconnected: true, dbmode: "mongodb" }
    }
    catch (error) {
        console.log("cant connect to mongo db  shifted to local memory");
        return { isconnected: true, dbmode: "memory" }
    }
}

function getDbStatus() {
    return {
        dbmode,
        isconnected,
        mongooseReadyState: mongoose.connection.readyState,
    }
}

export { memoryDB, connectDB, getDbStatus };
