import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import {transports} from 'engine.io'


import expressSetUp from './express.js'
import webSocketSetUp from './socket.js'


//first start C:\Program Files\MongoDB\Server\8.0\bin> mongod
//mongoDB:
const mongoose = require('mongoose');

// Połączenie z bazą
mongoose.connect('mongodb://localhost:27017/mgrGame')
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));


// Definicje modeli
const AccountSchema = new mongoose.Schema({
    username: String,
    password: String
}, { collection: 'account' });

const ProgressSchema = new mongoose.Schema({
    username: String,
    x: Number,
    y: Number
}, { collection: 'progress' });

const Account = mongoose.model('account', AccountSchema);
const Progress = mongoose.model('progress', ProgressSchema);

var {serv, ses} = expressSetUp(Account);

webSocketSetUp(serv, ses, Progress);

