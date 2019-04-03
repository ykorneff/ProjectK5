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
let isStarted = false;
let isReady = false;
let mates = new Array();

let localConstraints = {
    video: true,
    audio: true
}

let peerConfig = null;

let peerConnection;

let localStream;
let remoteStreams = new Array();
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
        isChannelReady = true;
        isReady = true;

    }
    isOwner = user.isOwner;
    addUserToList(user.nick, isOwner);
    mates.push(user);
    console.log(`In room:`);
    console.log(mates);
});

socket.on('_sigGotMedia', (remoteSocketId)=> {
    console.log(`Socket ${remoteSocketId} got media`);
    startAttempt();
});

socket.on('_sigMessage', (msg)=>{
    if (msg.type==='offer'){
        if(!isOwner && !isStarted){
            startAttempt();
        }
        console.log('$$#@ 001:');
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
        makeAnswer();
    } else if (msg.type==='answer' && isStarted){
        console.log('$$#@ 002:');
        peerConnection.setRemoteDescription(new RTCSessionDescription(msg));
    } else if (msg.type==='candidate' && isStarted){
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: msg.lable,
            candidate: msg.candidate
        });
        peerConnection.addIceCandidate(candidate);
    } 
});
//End socket events handlers:



//Main functions:
function getUserMedia (constraints){
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream)=>{
        localStream = stream;
        isChannelReady = true;
        isReady=true;
        localVideoElement.srcObject=stream;
        socket.emit('_sigGotMedia', roomId);
    })
    .catch ((err)=>{
        console.log(err);
    });
}

function startAttempt(){
    console.log(`## startAttempt: started=${isStarted}; ready=${isReady}; localstream=${typeof localStream}`);
    if (!isStarted && (typeof localStream !=='undefined') && isReady) {
        console.log(`creating peer connection`);
        createPeerConnection();
        peerConnection.addStream(localStream);
        isStarted=true;
        console.log(`isOwner=${isOwner}`);
        if (isOwner){
            makeCall();
        }
    } else {
        console.log('startAttempt: do nothing')
    }
}

function createPeerConnection(pcConfig){
    try {
        peerConnection = new RTCPeerConnection(pcConfig);
        peerConnection.ondatachannel = handleChannelCallback;
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
        dataChannel = peerConnection.createDataChannel('dataChannelName');

        dataChannel.onopen = handleDataChannelOpen;
        dataChannel.onmessage = handleDataChannelMessageReceived;
        dataChannel.onerror = handleDataChannelError;
        dataChannel.onclose = handleDataChannelClose;
    }
    catch (err){
        console.log('Failed to create PeerConnection, exception: ' + err.message);
        return;
    }
}

function handleChannelCallback (event) {
    var receiveChannel = event.channel;
    receiveChannel.onopen = handleDataChannelOpen;
    receiveChannel.onmessage = handleDataChannelMessageReceived;
    receiveChannel.onerror = handleDataChannelError;
    receiveChannel.onclose = handleDataChannelClose;
}

function handleDataChannelOpen (event) {
    console.log(`dataChannel.OnOpen ${JSON.stringify(event)}`);
}

function handleDataChannelMessageReceived (event) {
    console.log(`dataChannel.OnMessage: ${event.data}`);
    //var ul = document.getElementById("messages");
    //var li = document.createElement("li");
    //li.appendChild(document.createTextNode(event.data));
    //ul.appendChild(li);
    //document.getElementById('messages').append($('<li>').text(event.data));
    //window.scrollTo(0, document.body.scrollHeight);
}

function handleDataChannelError (error) {
    console.log(`dataChannel.OnError: ${JSON.stringify(error)}`);
}

function handleDataChannelClose (event) {
    console.log(`dataChannel.OnClose ${JSON.stringify(event)}`);
}

function handleIceCandidate(event) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        socket.emit('_sigMessage',{
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
        console.log('End of candidates.');
    }
}

function handleRemoteStreamAdded(event){
    remoteStreams.push(event.stream);
    addVideoElement(event.id).srcObject=event.stream;//think about identifying elements and streams!
    console.log(`Remote stream added ${event.stream.id}`);
}

function handleRemoteStreamRemoved(event){
    console.log('Remote stream removed. Event: ', event);
}

function makeCall(){
    console.log('Sending offer to peer');
    peerConnection.createOffer().
    then((sessionDescription)=>{
        peerConnection.setLocalDescription(sessionDescription);
        console.log(`set local description send message: \n${sessionDescription}`);
        socket.emit('_sigMessage', sessionDescription);
    }).
    catch((err)=>{
        console.log(err.message);
    });
}

function makeAnswer(){
    console.log('Sending answer to peer.');

    peerConnection.createAnswer().
    then( function (sessionDescription) {
        peerConnection.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending message', sessionDescription);
        socket.emit('_sigMessage', sessionDescription);
    }).
    catch(function(err){
        console.log(`Error: ${err}`);
        
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