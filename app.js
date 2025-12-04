import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import expressSetUp from './server/serverAPI.js'
import webSocketSetUp from './server/serverWebSocket.js'
import { unique } from '@tensorflow/tfjs';


//first start C:\Program Files\MongoDB\Server\8.0\bin> mongod
//mongoDB:
const mongoose = require('mongoose');

//connecting to MongoDB:
mongoose.connect('mongodb://localhost:27017/mgrGame')
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));


//schema definitions:
const AccountSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}, { collection: 'account' });

const ProgressSchema = new mongoose.Schema(
    {
        username: { type: String, unique: true, required: true },
        x: Number,
        y: Number,
        score: Number,
        weapon: mongoose.Schema.Types.Mixed,
    },
    { collection: "progress" }
);

const Account = mongoose.model('account', AccountSchema);
const Progress = mongoose.model('progress', ProgressSchema);

Account.syncIndexes();

var {serv, ses, mongoStore} = expressSetUp(Account);

webSocketSetUp(serv, ses, mongoStore, Progress);

