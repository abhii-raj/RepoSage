const mongoose = require("mongoose");

function generateId() {
    return new mongoose.Types.ObjectId().toString();
}

function isMongooseConnected() {
    return mongoose.connection.readyState === 1;
}

function normalizeUpdateOptions(options = {}) {
    const opts = { ...options }
    if ('new' in opts) {
        if (!opts.returnDocument) {
            opts.returnDocument = opts.new ? 'after' : 'before';
        }
        delete opts.new;
    }

    if (!opts.returnDocument) {
        opts.returnDocument = 'after';
    }

    return opts;
}

function matchDoc(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const [key, val] of Object.entries(query)) {
        if (key === '$or' && Array.isArray(val)) {
            if (!val.some(subQ => matchDoc(doc, subQ))) return false;
            continue;
        }
        const docVal = doc[key];
        if (val && typeof val === 'object' && !(val instanceof Date)) {
            if (val.$regex) {
                const regex = new RegExp(val.$regex, val.$options || ' ');
                if (!regex.test(String(docVal || ' '))) return false;
            } else if (val.$in && Array.isArray(val.$in)) {
                if (!val.$in.map(String).includes(String(docVal))) return false;
            } else if (val.$ne !== undefined) {
                if (String(docVal) === val.$ne) return false;
            }
        } else {
            if (String(docVal) !== String(val)) return false;
        }
    }
    return true;
}

function createBaseAdapter(MongooseModel, getMemoryMap) {
    return {
        async find(query = {}, sort = null) {
            if (isMongooseConnected()) {
                const q = MongooseModel.find(query);
                return sort ? await q.sort(sort).lean() : await q.lean();
            }
            const list = Array.from(getMemoryMap().values()).filter(d => matchDoc(d, query));
            if (sort && sort.updatedAt) {
                return list.sort((a, b) => (sort.updatedAt === -1 ? new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0) : new Date(a.updatedAt || 0) - new Date(b.updatedAt || 0)));
            }
        },
        async findById(id) {
            if (isMongooseConnected()) {
                return await MongooseModel.findById(id).lean();
            }
            return getMemoryMap.get(String(id)) || null;
        },
        async findOne(query) {
            if (isMongooseConnected()) {
                return await MongooseModel.findOne(query).lean();
            }
            return Array.from(getMemoryMap().values().find(d => matchDoc(d, query))) || null;
        },
        async create(data) {
            if (isMongooseConnected) {
                let newdata = await MongooseModel.create(data);
                return newdata.toObject();
            }
            const id = data._id ? String(data._id) : generateId();
            const now = new Date();
            const doc = { ...data, _id: id, createdAt: now, updatedAt: now };
            getMemoryMap.set(id, doc);
            return doc;
        },
        async insertMany(docs) {
            if (isMongooseConnected()) return await MongooseModel.insertMany(docs);
            const inserted = []
            for (const d of docs) {
                const doc = await this.create(d);
                inserted.push(doc);
            }
            return inserted;
        },
        async updateOne(query, update) {
            if (isMongooseConnected()) return await MongooseModel.updateOne(query, update);
            const target = Array.from(getMemoryMap().values().find(d => matchDoc(d, query)));
            if (target) {
                const $set = update.$set || update;
                Object.assign(target, $set, { updatedAt: new Date() });
                getMemoryMap.set(String(target._id), target);
                return { matchedCount: 1, modifiedCount: 1 };
            }
            return { matchedCount: 0, modifiedCount: 0 };
        },
        async findByIdAndUpdate(id, update, options = { returnDocument: 'after' }) {
            const opts = normalizeUpdateOptions(options);
            if (isMongooseConnected()) return await MongooseModel.findByIdAndUpdate(id, update, opts).lean();
            const target = getMemoryMap().get(String(id));
            if (target) {
                if (update.$push && update.$push.messages) {
                    target.messages = target.messages || [];
                    if (Array.isArray(update.$push.messages)) target.messages.push(...update.$push.messages);
                    else target.messages.push(update.$push.messages);
                }
                const $set = update.$set || Object.fromEntries(Object.entries(update).filter(([k]) => !k.startsWith('$')));
                getMemoryMap().set(String(id), target);
                return target;
            }
            return null;
        },
        async deleteMany(docs) {
            if (isMongooseConnected()) return await MongooseModel.deleteMany(docs);
            let count = 0;
            for (const [id, doc] of getMemoryMap().entries()) {
                if (matchDoc(doc, query)) {
                    getMemoryMap().delete(id);
                    count++;
                }
            }
            return { deletedDoc: count };
        }
    }
};


export { generateId, isMongooseConnected, normalizeUpdateOptions, matchDoc, createBaseAdapter };

















