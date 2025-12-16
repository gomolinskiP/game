import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import expressSetUp from './server/serverAPI.js'
import webSocketSetUp from './server/serverWebSocket.js'
import MongoStore from "connect-mongo";

const session = require("express-session");



//first start C:\Program Files\MongoDB\Server\8.0\bin> mongod

const mongoose = require('mongoose');
import dotenv from 'dotenv';
dotenv.config();

async function serverStart(){
    try {
        //mongoDB:
        await mongoose.connect("mongodb://localhost:27017/mgrGame");
        console.log("✅ MongoDB connected");

        //mongo session store:
        const mongoStore = MongoStore.create({
            client: mongoose.connection.getClient(),
            collectionName: "sessions",
            ttl: 60 * 60 * 24, // 24 hours
        });

        //sessions:
        const ses = session({
            secret: process.env.SESSION_SECRET,
            resave: false,
            saveUninitialized: true,
            name: "cookieName",
            store: mongoStore,
            cookie: {
                maxAge: 1000 * 60 * 60 * 24, //24 hours
                httpOnly: true, //do not let JS access the cookie - helps preventing XSS
                secure: false, //use only HTTPS for cookie sending
                sameSite: "lax", //prevents CSRF attacks
            },
        });

        //schema definitions:
        const AccountSchema = new mongoose.Schema(
            {
                username: { type: String, unique: true, required: true },
                password: { type: String, required: true },
            },
            { collection: "account" }
        );

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

        //db collections models:
        const Account = mongoose.model("account", AccountSchema);
        const Progress = mongoose.model("progress", ProgressSchema);

        Account.syncIndexes();

        //set up server HTTP(S) server and API with Express:
        var { serv } = expressSetUp(ses, Account);

        //set up WebSocket communcation and game logic:
        webSocketSetUp(serv, ses, Progress);
    } catch (err) {
        console.error("STARTUP ERROR: ", err);
        process.exit(1);
    }
}

serverStart();





