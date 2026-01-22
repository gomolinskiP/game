//first start C:\Program Files\MongoDB\Server\8.0\bin> mongod
//C:\Program Files\MongoDB\Server\8.0\bin>.\mongod --dbpath "C:\Program Files\MongoDB\Server\8.0\data"
import Mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import dotenv from "dotenv";

//load environment variables from .env file:
dotenv.config();

async function serverStart() {
    try {
        //mongoDB:
        await Mongoose.connect("mongodb://localhost:27017/mgrGame");
        console.log("✅ MongoDB connected!");

        //mongo session store:
        const mongoStore = MongoStore.create({
            client: Mongoose.connection.getClient(),
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
        const AccountSchema = new Mongoose.Schema(
            {
                username: { type: String, unique: true, required: true },
                password: { type: String, required: true },
            },
            { collection: "account" }
        );

        const ProgressSchema = new Mongoose.Schema(
            {
                username: { type: String, unique: true, required: true },
                x: Number,
                y: Number,
                score: Number,
                weapon: Mongoose.Schema.Types.Mixed,
            },
            { collection: "progress" }
        );

        //db collections models:
        const Account = Mongoose.model("account", AccountSchema);
        const Progress = Mongoose.model("progress", ProgressSchema);

        Account.syncIndexes();

        //set up HTTP(S) server and API with Express:
        const { default: expressSetUp } = await import("./server/serverAPI.js");
        var { serv } = expressSetUp(ses, Account);

        //set up WebSocket communcation and game logic:
        const { default: webSocketSetUp } = await import("./server/serverWebSocket.js");
        webSocketSetUp(serv, ses, Progress);
    } catch (err) {
        console.error("STARTUP ERROR: ", err);
        process.exit(1);
    }
}

serverStart();
