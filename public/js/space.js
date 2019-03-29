'use strict';

const _tl = 5;
let socket = io();

function makeId(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

let roomId = localStorage.getItem('roomId');
if (roomId==='') {
    roomId = makeId(8);
}

let userNick = localStorage.getItem('nickName');
if (userNick==='') {
    userNick = makeId(8);
}
let isOwner;
let mates = new Array();


//Socket events handlers:
socket.on('_sigJoined', (user) => {
    if (user.isOwner){
        console.log(`User ${userNick} has created room ${user.room}. Is owner = ${user.isOwner}`);
    } else {
        console.log(`User ${user.nick} had joined room ${user.room}. Is owner = ${user.isOwner}`);
    }
    isOwner = user.isOwner;
    mates.push(user);
    console.log(`In room:`);
    console.log(mates);
});

socket.emit('_sigEnterRoom', roomId, userNick);


/*
function timeStamp (){
    let now = new Date(Date.now());
    return `<${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}>`;
}

function doTrace (message, level, traceLevel){
    if (level <= traceLevel) {
       if (typeof message === 'object'){
            console.log(`${timeStamp()}${levels.get(level)}::`);
            console.log(message);
        }else {
            console.log(`${timeStamp()}${levels.get(level)}::${message}`);
        }
    }
    
}
*/

//doTrace(`Client entered the space`,3, _tl);