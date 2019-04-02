'use strict';
//import './app.css';
const appConfig = {
    traceLevel: 5
};

const _tl = appConfig.traceLevel;

var path = require('path');
var express = require('express');

var app = express();
app.use('/styles', express.static('public/css'));
app.use('/scripts', express.static('public/js'));
//app.use('/html', express.static('public/html'));
console.log(__dirname);

var fs = require('fs');
var tools = require('./tools.js');

var privateKey = fs.readFileSync('key.pem').toString();
var certificate = fs.readFileSync('cert.pem').toString();
var credentials = {
  key: privateKey,
  cert: certificate,
};
var https = require('https').Server(credentials,app);
var io = require('socket.io')(https);

/*
var user = {
    id: '',
    nick: '',
    room: '',
    isOwner: false
}
*/

var room = {
    id: '',
    mates: 0
}

var rooms = new Array();

var users = new Array();

app.get('/', function(req, res){
    res.sendFile(`${__dirname}/index.html` );
});

app.get('/space', function(req,res){
    tools.doTrace(`Request to /space recived, response send`, 4, _tl);
    //tools.doTrace(req, 6, _tl);
    res.sendFile(`${__dirname}/html/space.html`);
});




//io.emit('some event', {for: 'evereyone'});


https.listen(3001, function(){
    tools.doTrace('listening on port 3001',3);
});

tools.doTrace('K5 started',3, _tl);

io.on('connection', function(socket){

    tools.doTrace(`User connected`, 3 , _tl);
    tools.doTrace(`Socket ID = ${socket.id}`, 4, _tl);

    socket.on('disconnect', function(){
        tools.doTrace(`User disconnected`, 3 , _tl);
        tools.doTrace(`Socket ID = ${socket.id}`, 4, _tl);
    });

    socket.on('_sigEnterRoom', (roomId, userNick) => {
        tools.doTrace(`User "${userNick}" has entered room "${roomId}"`, 3, _tl)
        socket.join(roomId);
        let user = {
            id: '',
            nick: '',
            room: '',
            isOwner: false
        };
        user.id=socket.id;
        user.nick = userNick;
        user.room = roomId;
        var matesInRoom = io.sockets.adapter.rooms[roomId].length;   
//        console.log(io.sockets.adapter.rooms[roomId].sockets);
        tools.doTrace(`There are ${matesInRoom} users in the room "${roomId}"`, 4, _tl);
        if (matesInRoom === 1) {
            user.isOwner = true;
        }
        //users.push(user);
        room.id = roomId;
        room.mates = matesInRoom;
        //rooms.push(room);
        //socket.emit('_sigJoined', user);
        io.in(roomId).emit('_sigJoined',user);
        
    });

    socket.on('_sigGotMedia',(roomId)=>{
        tools.doTrace(`RX: _sigGotMedia from ${socket.id} in ${roomId}`,4, _tl);
        io.in(roomId).emit('_sigGotMedia', socket.id);
    });

    socket.on('_sigMessage', (msg)=>{
        console.log(`_sigMessage ${msg.type}`);
        io.emit('_sigMessage', msg);
    });

    
});

