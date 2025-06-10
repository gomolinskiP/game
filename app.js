import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import {transports} from 'engine.io'


import expressSetUp from './express.js'
import webSocketSetUp, {Entity, Player, Bullet} from './socket.js'


//first start C:\Program Files\MongoDB\Server\8.0\bin> mongod
//mongoDB:
var mongojs = require('mongojs');
var db = mongojs('localhost:27017/mgrGame', ['account', 'progress']);

var {serv, ses} = expressSetUp(db);

webSocketSetUp(serv, ses, db);

