'use strict';

//import { disconnect } from "cluster";

//Defenition section:
const _tl = 5;
let socket = io();

let tempuser;

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
let isStartVideoPressed = false;
let isSharingPressed = false;
let isGotMediaReceived = false;
let mates = new Array();


let pcConfig = null;

let localConstraints = {
    video: true,
    audio: true
}

let peerConfig = null;
let receiveOnly = {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true
}

let peerConnection;

let localStream;
let remoteStreams = new Array();
let localVideoElement = document.getElementById('localVideo');

let peerConnections = new Map();
let dataChannels = new Map();

//End definition section

Array.prototype.findByValueOfObject = function(key, value) {
    return this.filter(function(item) {
        return (item[key] === value);
    });
}

//MAIN:
socket.emit('_sigEnterRoom', roomId, userNick);
//getUserMedia(localConstraints);



//END MAIN



//Web elements handlers:
function btnSendOnClick(){
    let textToSendElement = document.getElementById('textToSend'); 
    let text = textToSendElement.value;
    if (text!=='') {
        addChatMessage(text, userNick, timeStampShort(), 'local');
        socket.emit('_chatMessage', roomId, userNick, text);
        text = '';
        textToSendElement.value = '';
        
    }
    
}

function initVideoOnClick(){
    getUserMedia(localConstraints);
}
//End web elements handlers

//Socket events handlers:
socket.on('_sigJoined', (extCode, user, users) => {
    switch (extCode) {
        case 1:
            console.log('1:');
            if (user.isOwner){
                console.log(`User ${userNick} has created room ${user.room}. Is owner = ${user.isOwner}`);
            } else {
                console.log(`User ${user.nick} had joined room ${user.room}. Is owner = ${user.isOwner}`);
                isChannelReady = true;
                isReady = true;

            }
            isOwner = user.isOwner;
            addUserToList(user.nick, isOwner);
            //mates.push(user);
            users.forEach(element => {
                addUserToList(element.nick, element.isOwner);
                mates.push(element);
                console.log(`dd: ${element.id}//${element.nick}`);
                //peerConnections.set(element.id, createPeerConnection(pcConfig));
                //dataChannels.set(element.id, createPeerDataChannel(peerConnections.get(element.id)));
                //console.log(`peer for ${element.id}: \n`, peerConnections.get(element.id));
                //console.log(`peerDC for ${element.id}: \n`, dataChannels.get(element.id));
            });
            //console.log(`In room:`);
            //console.log(mates);
        break;
        case 2:
            console.log('2:');
            addUserToList(user.nick, isOwner);
            console.log(`joined:\n`,user);
            //peerConnections.set(user.id, createPeerConnection(pcConfig));
            //dataChannels.set(user.id, createPeerDataChannel(user.id, peerConnections.get('user.id')));
            //console.log(`peer for ${user.id}: \n`, peerConnections.get(user.id));
            //console.log(`peerDC for ${user.id}: \n`, dataChannels.get('user.id'));
            mates.push(user);

            if (localStream!==undefined) {
                console.log(localStream);
                console.log(`create peer for ${user.nick}/${user.id}`);
                peerConnections.set(user.id, createPeerConnection(pcConfig))
                peerConnections.get(user.id).addStream(localStream);
                console.log(peerConnections.get(user.id));
                doP2Pcall(peerConnections.get(user.id));
            }
            //console.log(mates);
            //console.log(`dd: ${user.id}//${user.nick}\n `,peerConnections.get(user.id));
            //doP2Pcall(peerConnections.get(user.id),user.id);
            
        break
    }



});

socket.on('_chatMessage', (roomId,user,msg) =>{
    console.log(`new message: ${user}->${msg}`);
    addChatMessage(msg, user, timeStampShort(), 'remote');
});

socket.on('_sigDisconnected', (disconnectedUser) => {
    console.log(disconnectedUser);
    tempuser = disconnectedUser;
    //mates.indexOf(mates.findByValueOfObject('id', tempuser.id)[0]);
    //mates.splice(mates.findIndex(mates.indexOf(mates.findByValueOfObject('id', tempuser.id)[0])),1);
    
    mates.splice(mates.indexOf(mates.findByValueOfObject('id', tempuser.id)[0]),1);
    removeUserFromList(disconnectedUser.nick);
    peerConnections.delete(tempuser.id);
    //dataChannels.delete(tempuser.id);
    console.log(`User ${disconnectedUser.nick} left the room ${disconnectedUser.room}`);
    // ADD notification to chat
});

socket.on ('_sigInProgress', (sigId) =>{
    console.log(`RX<- _sigInProgress::${sigId}`);
});

socket.on('_sigDoCall', (sigId, roomId, sessionDescription, type, srcUser)=>{
    console.log(`RX<- _sigDoCall.${type}::${sigId} from ${srcUser} with SDP: \n`);    
    console.log(sessionDescription);
    let sdpType = sessionDescription.type;
    if (localStream==undefined){
        peerConnections.set(srcUser, createPeerConnection(receiveOnly));
    } else {
        peerConnections.set(srcUser, createPeerConnection(pcConfig));
    }
    if (sdpType === 'offer'){
        console.log('$$$0001 do answer to ', srcUser);
        console.log(peerConnections.get(srcUser),`\n`,peerConnections.get(srcUser).signalingState)
        doP2Panswer(peerConnections.get(srcUser),srcUser,sigId)
    }
});

socket.on('_sigAnswer',  (sigId, roomId, sessionDescription, type, srcUser)=>{
    console.log(`RX<- _sigAnswer.${type}::${sigId} from ${srcUser} with SDP: \n`);    
    console.log(sessionDescription);
    let sdpType=sessionDescription.type;
    if (sdpType==='answer'){
        console.log('$$$0002 answer received');
        peerConnections.get(srcUser).setRemoteDescription(new RTCSessionDescription(sessionDescription));
    } else if (msg.type==='candidate'){
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: sessionDescription.lable,
            candidate: sessionDescription.candidate
        });
        console.log('$$$0003 candidate')
        peerConnections.get(srcUser).addIceCandidate(candidate);
    } 
});

socket.on('_sigAck', (sigId, message) =>{
    console.log(`RX-> _sigAck on ${message}::${sigId}`);
    startAttempt();/// !!! check check check!!!
});

socket.on('_sigGotMedia', (sigId, roomId, userName, sigMessageType) => {
console.log(`RX-> _sigGotMedia.${sigMessageType}::${sigId} from ${socket.id}/${userName} in room:${roomId};`);
switch (sigMessageType) {
    case 1:
    break;
    case 2:
        //others
    break;
}
});
/*
//old attempt
socket.on('_sigGotMedia', (remoteSocketId)=> {
    console.log(`Socket ${remoteSocketId} got media`);
    startAttempt();
});

socket.on('_sigAck', (extParam) => {
    console.log(`Socket ${socket.id} got ACK on gotMedia`);
    startAttempt();
});

socket.on('_sigMessage', (msg)=>{
    if (msg.type==='offer'){
        //if(!isOwner && !isStarted){
            startAttempt();
        //}
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
//end
*/


//Main functions:
function getUserMedia (constraints){
    navigator.mediaDevices.getUserMedia(constraints)
    .then((stream)=>{
        localStream = stream;
        //isChannelReady = true;
        //isReady=true;
        localVideoElement.srcObject=stream;
        let sigId = makeId(8);
        //console.log(`TX: _sigGotMedia::${sigId}` );
        //socket.emit('_sigGotMedia', sigId, roomId, user.nick, 1); //1=user init video 
        mates.forEach( mate => {
            console.log(`create peer for ${mate.nick}/${mate.id}`);
            peerConnections.set(mate.id, createPeerConnection(pcConfig))
            peerConnections.get(mate.id).addStream(localStream);
            console.log(peerConnections.get(mate.id));
            doP2Pcall(peerConnections.get(mate.id));
        });
        
    })
    .catch ((err)=>{
        console.log(err);
    });
}

function startStreaming(){
    console.log(`APP-> creating peer connection`);
    
}

function startAttempt(){
    //console.log(`## startAttempt: started=${isStarted}; ready=${isReady}; localstream=${typeof localStream}`);
    //if (!isStarted && (typeof localStream !=='undefined') && isReady) {
    if (!isStarted /*&& (typeof localStream !=='undefined')*/) {
        console.log(`creating peer connection`);
        createPeerConnection();
        peerConnection.addStream(localStream);
        isStarted=true;
        //console.log(`isOwner=${isOwner}`);
        //if (isOwner){
        if (isStartVideoPressed && !isGotMediaReceived) {
            makeCall();
        }
    } else {
        console.log('startAttempt: do nothing')
    }
}

function createPeerConnection(pcConfig) {
    try{
        let pc = new RTCPeerConnection(pcConfig);
        pc.ondatachannel = handleChannelCallback;
        pc.onicecandidate = handleIceCandidate;
        //pc.onaddstream = handleRemoteStreamAdded; //
        pc.ontrack = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        //console.log('created peer', pc);
        return pc;
    }
    catch(err){
        console.log('Failed to create PeerConnection, exception: ' + err.message);
        return;
    }
}

function createPeerDataChannel(name, peer) {
    try{
        let dc = peer.createDataChannel(name);
        dc.onopen = handleDataChannelOpen;
        dc.onmessage = handleDataChannelMessageReceived;
        dc.onerror = handleDataChannelError;
        dc.onclose = handleDataChannelClose;
        return dc;
    }
    catch(err){
        console.log(`Failed to create DataChannel for ${name}, exception: ` + err.message);
        return;
    }
}

function _createPeerConnection(pcConfig){
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
        //socket.emit('_sigMessage',{
        socket.emit('_sigCandidate',dstUser,{ //вот тут видимо собака порылась. надо придумать как в event запихнуть dstUser
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
    remoteStreams.push(event.stream); //replace Array with a Map
    addVideoElement(event.id).srcObject=event.stream;//think about identifying elements and streams!
    console.log(`Remote stream added ${event.stream.id}`);
}

function handleRemoteStreamRemoved(event){
    console.log('Remote stream removed. Event: ', event);
}

function doP2Pcall(peer, dstUser){
    peer.createOffer().
    then((sessionDescription)=>{
        peer.setLocalDescription(sessionDescription);
        let sigId = makeId(8);
        console.log(`TX-> send offer wit SDP for ${dstUser}:`, sessionDescription);
        socket.emit('_sigDoCall', sigId , roomId, sessionDescription, 1, '__BC__');
    }).
    catch((err)=>{
        console.log(err);
    })
}

function _makeCall(){
    console.log('Sending offer to peer');
    peerConnection.createOffer().
    then((sessionDescription)=>{
        peerConnection.setLocalDescription(sessionDescription);
        console.log(`set local description send message: \n${sessionDescription}`);
        socket.emit('_sigMessage', roomId, sessionDescription);
    }).
    catch((err)=>{
        console.log(err.message);
    });
}

function doP2Panswer(peer, dstUser, sigId){

    peer.createAnswer().
    then((sessionDescription)=> {
        peer.setLocalDescription(sessionDescription);
        console.log();
        socket.emit('_sigAnswer', sigId, roomId, sessionDescription, 1, dstUser);
    }).
    catch ((err)=>{
        console.log(`Error:`,err);
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