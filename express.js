import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const argon2 = require('argon2')

export default function expressSetUp(db){
    var express = require('express');
    var app = express();
    var favicon = require('serve-favicon')
    const session = require('express-session')
    const { checkLoggedIn, bypassLogin } = require('./middlewares')
    var serv = require('http').Server(app);

    app.use(favicon('client/img/placeholder.png'))
    app.use(express.urlencoded({extended: false}));
    const ses = session({
        secret: 'placeholder_session_secret',
        resave: true,
        saveUninitialized: false,
        name: 'cookieName'
    });

    app.use(ses);
    //express for file communication:
    app.get('/', bypassLogin, function(req, res){
        res.sendFile(__dirname + '/client/index.html');
    });

    app.post('/login', function(req, postRes){
        console.log(req.body)
        db.account.findOne({username: req.body.username}, async (err, res)=>{
            if(res){
                //account exists
                    const isPasswordHashMaching = await argon2.verify(res.password, req.body.password);
                    if(isPasswordHashMaching){
                        //password correct - sign in success
                        console.log("//password correct - sign in success")

                        //create session:
                        req.session.user = {username: req.body.username}

                        postRes.redirect('/game');
                    }
                    else{
                        //pasword incorrect
                        console.log("incorrect password")
                        postRes.redirect('/?err=wrongPass');
                    }
                }
                else{
                    //incorrect username
                    console.log("no such username")
                    postRes.redirect('/?err=noUser');
                }
            })
    })

    app.post('/register', function(req, postRes){
        //HAVE TO ADD VALIDATION
        db.account.findOne({username: req.body.username}, async function(err, res){
            console.log(res)
            if(res){
                //acount already exists
                postRes.redirect('/?err=usernameTaken');
            }
            else{
                //TODO: check if username correct (allowed) here
                const passwordHash = await argon2.hash(req.body.password, {type: argon2.argon2id});

                db.account.insertOne({username: req.body.username, password: passwordHash});
                postRes.redirect('/?err=registerSuccess');
            }
        })
    })

    app.get('/game', checkLoggedIn, function(req, res){
        res.sendFile(__dirname + '/client/game.html')
    })

    app.get('/logout', function(req, res){
        req.session.destroy();
        res.clearCookie('cookieName');
        res.redirect('/');
    })

    app.use('/client', express.static(__dirname + '/client'));
    app.use(express.static('client'));
    serv.listen(2000);

    console.log("Server started.");
    return {serv, ses}
}

