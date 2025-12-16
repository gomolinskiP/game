import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const argon2 = require('argon2');
const fs = require('fs');
const https = require('https');

//Environtment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

export default function expressSetUp(ses, Account){
    var express = require("express");
    var app = express();

    //use EJS view engine with "views" folder:
    app.set("views", "views");
    app.set("view engine", "ejs");
    var favicon = require("serve-favicon");

    const { checkLoggedIn, bypassLogin } = require("./middlewares");
    //cert for httpS:
    const options = {
        key: fs.readFileSync("certs/server.key"),
        cert: fs.readFileSync("certs/server.cert"),
    };
    // var serv = require("http").Server(app);
    const serv = https.createServer(options, app);
    //TODO mkcert to make it work with VSCode DevTunnels

    app.use(favicon("client/img/logo.svg"));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    //use sessions:
    app.use(ses);

    //ROUTING:
    app.get("/", bypassLogin, function (req, res) {
        if (req.query.err) {
            req.session.err = req.query.err;
            return res.redirect("/");
        }

        let isLogged = false;
        let username = undefined;
        let err = req.session.err;
        delete req.session.err;

        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
        }

        res.render("index", {
            isLogged: isLogged,
            username: username,
            error: err,
        });
    });

    app.get("/login", function (req, res) {
        if (req.query.err) {
            req.session.err = req.query.err;
            return res.redirect("/login");
        }

        let isLogged = false;
        let username = undefined;
        let err = req.session.err;
        delete req.session.err;

        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
            return res.redirect("/");
        }

        res.render("login", {
            isLogged: isLogged,
            username: username,
            error: err,
        });
    });

    app.post("/login", async function (req, res) {
        try {
            //check if username exists:
            const user = await Account.findOne({ username: req.body.username });

            if (!user) {
                //incorrect username
                console.log("no such username");
                return res.redirect("/login?err=noUser");
            }

            //check if password is correct:
            const isPasswordHashMaching = await argon2.verify(
                user.password,
                req.body.password
            );
            if (!isPasswordHashMaching) {
                //pasword incorrect
                console.log("incorrect password");
                return res.redirect("/login?err=wrongPass");
            }

            //password correct - sign in success
            console.log("//password correct - sign in success");

            //create session:
            req.session.user = { username: req.body.username };

            req.session.save((err)=>{
                if(err) console.error("Session save error: ", err);
                console.log(
                    "LOGIN sessionID:",
                    req.sessionID,
                    "user:",
                    req.session?.user
                );
                return res.redirect("/");
            })
        } catch (err) {
            console.error("Login error", err);
            return res.redirect(`/login?err=${err}`);
        }
    });

    app.get("/register", function (req, res) {
        if (req.query.err) {
            req.session.err = req.query.err;
            return res.redirect("/register");
        }

        let isLogged = false;
        let username = undefined;
        let err = req.session.err;
        delete req.session.err;

        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
            return res.redirect("/");
        }

        res.render("register", {
            isLogged: isLogged,
            username: username,
            error: err,
        });
    });

    app.post("/register", async function (req, postRes) {
        const isLoadTest = req.headers["x-loadtest"];

        const chosenUsername = req.body.username;
        const chosenPassword = req.body.password;
        const repeatedPassword = req.body.repPassword;

        //username validation:
        const validUsername = /^[0-9A-Za-z]{2,16}$/;
        if (!validUsername.test(chosenUsername)) {
            return postRes.redirect("/register?err=usernameInvalid");
        }

        //password validation:
        const validPassword = /^(?=.*?[0-9])(?=.*?[A-Za-z]).{8,32}$/;
        if (!validPassword.test(chosenPassword)) {
            return postRes.redirect("/register?err=passwordInvalid");
        }

        //check if repeated password is the same as the first one:
        if (chosenPassword !== repeatedPassword) {
            return postRes.redirect("/register?err=passwordMismatch");
        }

        try{
            const passwordHash = await argon2.hash(chosenPassword, {
                type: argon2.argon2id,
            });

            await Account.insertOne({
                username: chosenUsername,
                password: passwordHash,
            });
            return postRes.redirect("/register?err=registerSuccess");
        }
        catch(err){
            if(err.code === 11000){
                //username already exists in DB (taken):
                return postRes.redirect("/register?err=usernameTaken");
            }

            console.error("Register error: ", err);
            return postRes.redirect("/register?err=serverError");
        }
    });

    app.get("/game", checkLoggedIn, function (req, res) {
        let isLogged = false;
        let username = undefined;
        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
        }

        res.render("game", { isLogged: isLogged, username: username });
    });

    app.get("/logout", function (req, res) {
        req.session.destroy();
        res.clearCookie("cookieName");
        res.redirect("/");
    });

    app.get("/about", function (req, res) {
        if (req.query.err) {
            req.session.err = req.query.err;
            return res.redirect("/about");
        }

        let isLogged = false;
        let username = undefined;
        let err = req.session.err;
        delete req.session.err;

        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
        }

        res.render("about", {
            isLogged: isLogged,
            username: username,
            error: err,
        });
    });

    app.get("/contact", function (req, res) {
        if (req.query.err) {
            req.session.err = req.query.err;
            return res.redirect("/contact");
        }

        let isLogged = false;
        let username = undefined;
        let err = req.session.err;
        delete req.session.err;

        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
        }

        res.render("contact", {
            isLogged: isLogged,
            username: username,
            error: err,
        });
    });

    app.get("/privacy", function (req, res) {
        if (req.query.err) {
            req.session.err = req.query.err;
            return res.redirect("/privacy");
        }

        let isLogged = false;
        let username = undefined;
        let err = req.session.err;
        delete req.session.err;

        if (req.session?.user?.username) {
            isLogged = true;
            username = req.session.user.username;
        }

        res.render("privacy", {
            isLogged: isLogged,
            username: username,
            error: err,
        });
    });

    //static route (/client dir contents are available to client):
    app.use("/client", express.static(__dirname + "/client"));
    app.use(express.static("client"));

    //start server on port:
    serv.listen(2000);

    console.log("✅ HTTPS server started.");
    return { serv };
}

