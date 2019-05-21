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
        console.log(socket.id);
        //console.log(users);
        Array.prototype.findByValueOfObject = function(key, value) {
            return this.filter(function(item) {
              return (item[key] === value);
            });
          }
        //console.log(ttt);        
        let disconnectedUser = users.findByValueOfObject('id', socket.id);
        //console.log(disconnectedUser[0].room);
        //socket.to(`${disconnectedUser[0].room}`).emit('_sigDisconnected', disconnectedUser[0]);
        let sigId = tools.makeId(10);
        //console.log('dd: ', disconnectedUser[0].room);
        socket.to(`${disconnectedUser[0].room}`).emit('_sigDisconnected', sigId, 'SRV', 'ALL', 2, {disconnectedUser: disconnectedUser[0]});
        console.log(`${tools.timeStamp()}||TX: SRV -> ALL _sigDisconnected::${sigId}.2`);
        // DELETE USER from users[]
        console.log(users);
        console.log();
        users.splice(users.indexOf(disconnectedUser[0]),1);
        console.log(users);
        //let currentRoom = users.find(item => item.nick === socket.id).room;
        //console.log(users.find(item => item.nick === `${socket.id}`));

        //tools.doTrace(`Socket ID = ${socket.id} from room ${currentRoom}`, 4, _tl);
    });

    //socket.on('_chatMessage', (roomId,user,msg)=>{
    socket.on('_chatMessage',  (sigId, from, to, type, data) => {
        console.log(`${tools.timeStamp()}||RX: _chatMessage${from} -> ${to} _sigEnter::${sigId}.${type}:`);
        console.log(`${data.userNick}:\n`+data.text);
        //tools.doTrace(`Message:\nroom: ${roomId}\nfrom: ${user}\ntext: ${msg}`, 5, _tl);
        socket.to(data.roomId).emit('_chatMessage', sigId, from,  to, 2 , data);
        //socket.to(roomId).emit('_chatMessage', roomId, user, msg);
    });

    //socket.on('_sigEnterRoom', (roomId, userNick) => {
    socket.on('_sigEnter', (sigId, from, to, type, data) => {
        //tools.doTrace(`User "${userNick}" has entered room "${roomId}"`, 3, _tl)
        console.log(`${tools.timeStamp()}||RX: ${socket.id} -> ${to} _sigEnter::${sigId}.${type}`);
        socket.join(data.roomId);
        let user = {
            id: '',
            nick: '',
            room: '',
            isOwner: false
        };
        user.id=socket.id;
        user.nick = data.userNick;
        user.room = data.roomId;
        var matesInRoom = io.sockets.adapter.rooms[data.roomId].length;   
//        console.log(io.sockets.adapter.rooms[roomId].sockets);
        //tools.doTrace(`There are ${matesInRoom} users in the room "${data.roomId}"`, 4, _tl);
        console.log(`${tools.timeStamp()}||SI: There are ${matesInRoom} users in the room "${data.roomId}"`)
        if (matesInRoom === 1) {
            user.isOwner = true;
        }
        
        room.id = data.roomId;
        room.mates = matesInRoom;
        //rooms.push(room);
        //socket.emit('_sigJoined', user);
        //io.in(roomId).emit('_sigJoined',user);
        //io.to(`${user.id}`).emit('_sigJoined', 1, user, users);
        io.to(user.id).emit('_sigJoined',sigId, socket.id, 'ALL', 2, {user: user, users: users});
        //socket.to(`${data.roomId}`).emit('_sigJoined', 2, user, null);
        socket.to(data.roomId).emit('_sigJoined', sigId, socket.id, 'ALL', 4, {user: user, users:null});
        users.push(user);
    });

    socket.on('_sigCalling', (sigId, from, to, type, data) => {
        console.log(`${tools.timeStamp()}||RX: ${from} -> ${to} _sigCalling::${sigId}.${type}//${data.type} with SDP:\n`, data);
        io.to(to).emit('_sigCalling', sigId, socket.id, to, 2, data);
        console.log(`${tools.timeStamp()}||TX: ${from} -> ${to} _sigCalling::${sigId}.2//${data.type}`);
    });

/*
    socket.on('_sigDoCall', (sigId , roomId, sessionDescription, type, dstUser) => {
        tools.doTrace(`RX<- _sigDoCall.${type}::${sigId} from ${socket.id} to ${dstUser} with SDP: \n`, 4, _tl);
        console.log(sessionDescription);
        let newSigId = tools.makeId(8);
        tools.doTrace(`TX-> _sigDoCall.2::${newSigId} from ${socket.id} to ${dstUser}n`, 4, _tl);
        if (dstUser=='__BC__') {
            socket.to(roomId).emit('_sigDoCall', newSigId, roomId, sessionDescription, 4, socket.id);
        } else {
            io.to(dstUser).emit('_sigDoCall', newSigId, roomId, sessionDescription, 2, socket.id);
        }
        socket.emit('_sigInProgress', sigId)
        
    });


    socket.on('_sigAnswer', (sigId, roomId, sessionDescription, type, dstUser) => {
        tools.doTrace(`RX<- _sigAnwer.${type}::${sigId} from ${socket.id} to ${dstUser} with SDP: \n`, 4, _tl);
        console.log(sessionDescription);
        let newSigId = tools.makeId(8);
        tools.doTrace(`TX-> _sigAnswer.2::${newSigId} from ${socket.id} to ${dstUser}n`, 4, _tl);
        io.to(dstUser).emit('_sigAnswer', newSigId, roomId, sessionDescription, 2, socket.id);
        //socket.emit('_sigInProgress', sigId)
    });

    socket.on('_sigCandidate', (sigId, msg, dstUser, type)=> {
        tools.doTrace(`RX<- _sigCandidate.${type}::${sigId} from ${socket.id} to ${dstUser}\n\n`+msg, 4, _tl);
        io.to(dstUser).emit('_sigCandidate', tools.makeId(8), msg, 2, socket.id);
    });

*/
    //'_sigMessage', sigId , roomId, sessionDescription, 1, dstUser)


/* forget for a while
    socket.on('_sigGotMedia', (sigId, roomId, userName, sigMessageType) => {
        tools.doTrace(`RX-> _sigGotMedia.${sigMessageType}::${sigId} from ${socket.id}/${userName} in room:${roomId};`,4, _tl);
        switch (sigMessageType){
            case 1:
                io.to(socket.id).emit('_sigAck', sigId, '_sigGotMedia');
                socket.in(roomId).emit('_sigGotMedia', tools.makeId(8), roomId, userName, 2) //
            break;
        }
    });

*/
    
/* 
//old attempt     
    socket.on('_sigGotMedia',(roomId, user, extParam)=>{
        tools.doTrace(`RX: _sigGotMedia::${extParam} from ${socket.id} in ${roomId}`,4, _tl);
        switch(extParam) {
            case 1: 
                io.to(socket.id).emit('_sigAck',1);
                socket.in(roomId).emit('_sigGotMedia', roomId, user, 2);// 2=broadcast to room mates that someone has media to stream
            break;
            
        }
    });

    socket.on('_sigMessage', (roomId, sdp)=>{
        console.log(`_sigMessage ${sdp.type}`);
        io.in(roomId).emit('_sigMessage', roomId, sdp);
    });
//end
 */

//new attempt

//end
});

