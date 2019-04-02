'use strict';

//Defenition section:
const _tl = 5;
let socket = io();


let roomId = localStorage.getItem('roomId');
if (roomId==='') {
    roomId = makeId(8);
}

let userNick = localStorage.getItem('nickName');
if (userNick==='') {
    userNick = makeId(8);
}
let isOwner;
let isChannelReady=false;
let mates = new Array();

let localConstraints = {
    video: true,
    audio: true
}

let peerConfig = null;

let localStream;
let localVideoElement = document.getElementById('localVideo');

//End definition section

//MAIN:
socket.emit('_sigEnterRoom', roomId, userNick);
getUserMedia(localConstraints);



//END MAIN



//Web elements handlers:
function btnSendOnClick(){
    let textToSendElement = document.getElementById('textToSend'); 
    let text = textToSendElement.value;
    if (text!=='') {
        addChatMessage(text, userNick, timeStampShort(), 'local');
        text = '';
        textToSendElement.value = '';
    }
}
//End web elements handlers

//Socket events handlers:
socket.on('_sigJoined', (user) => {
    if (user.isOwner){
        console.log(`User ${userNick} has created room ${user.room}. Is owner = ${user.isOwner}`);
    } else {
        console.log(`User ${user.nick} had joined room ${user.room}. Is owner = ${user.isOwner}`);
    }
    isOwner = user.isOwner;
    addUserToList(user.nick, isOwner);
    mates.push(user);
    console.log(`In room:`);
    console.log(mates);
});
//End socket events handlers:



//Main functions:
function getUserMedia (constraints){
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream)=>{
        localStream = stream;
        isChannelReady = true;
        localVideoElement.srcObject=stream;
        socket.emit('_sigGotMedia', roomId);
    })
    .catch ((err)=>{
        console.log(err);
    });
}

//End main functions

//Tools:
function timeStamp (){
    let now = new Date(Date.now());
    return `<${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}>`;
}

function timeStampShort (){
    let now = new Date(Date.now());
    return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
}

function makeId(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}
//End tools

/*function doTrace (message, level, traceLevel){
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