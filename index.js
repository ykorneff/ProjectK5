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

    socket.on('_sigEnterSpace', (roomId, userNick) => {
        tools.doTrace(`User "${userNick}" has entered space "${roomId}"`, 3, _tl)
        socket.join(roomId);
        var matesInSpace = io.sockets.adapter.rooms[socket.id].length;   
        //var matesAmount = matesInSpace ? Object.keys(matesInSpace.sockets).length : 0;
        //console.log(io.sockets.adapter.rooms[roomId]);
        tools.doTrace(`There are ${matesInSpace} users in the space "${roomId}"`, 4, _tl)
    })

    socket.on('_sigMessage', (msg)=>{
        console.log(`_sigMessage ${msg.type}`);
        io.emit('_sigMessage', msg);
    });

    
});

