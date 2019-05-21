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
//let remoteStreams = new Array();
let remoteStreams = new Map();
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

{
    //socket.emit('_sigEnterRoom', roomId, userNick);
    let sigId = makeId(10);
    socket.emit('_sigEnter', sigId, socket.id, 'ALL', 1,{roomId: roomId, userNick: userNick});
    console.log(`TX: ${socket.id} -> ALL _sigEnter::${sigId}.1 `);
    sigId = undefined;
}
//getUserMedia(localConstraints);
//END MAIN



//Web elements handlers:
function btnSendOnClick(){
    let textToSendElement = document.getElementById('textToSend'); 
    let text = textToSendElement.value;
    if (text!=='') {
        addChatMessage(text, userNick, timeStampShort(), 'local');
        //socket.emit('_chatMessage', roomId, userNick, text);
        let sigId = makeId(10);
        socket.emit('_chatMessage', sigId, socket.id, 'ALL', 1, {roomId: roomId, userNick:userNick, text:text});
        text = '';
        textToSendElement.value = '';
        
    }
    
}

function initVideoOnClick(){
    getUserMedia(localConstraints);
}

function getUserMedia(constraints) {
    console.log(`${timeStamp()}||CI: Get local user media...\ntrying...`);
    navigator.mediaDevices.getUserMedia(constraints).
    then((stream)=>{
        localStream=stream;
        localVideoElement = document.getElementById('localVideo');
        localVideoElement.srcObject=localStream;
        console.log(`${timeStamp()}||CI: ...complete with localstram: \n`, localStream);
//        remoteVideoElement = document.getElementById('remoteVideo');
//        socket.emit('_sigGotMedia', roomId);
        console.log(`${timeStamp()}||CI: Starting p2p calls...`);
        peerConnections.forEach((element)=>{
            console.log('dd', element);
            console.log(`${timeStamp()}||CI: Starting call. ${socket.id} is calling ${element.userId}...`);
            startPeerCall(element.userId, element.peer);
        });
        
    }).
    catch((err)=>{
        console.log(`${timeStamp()}||CI: ...failed with the error: \n`, err);
    });
}

function startPeerCall(dstUser, peer) {
    console.log(`${timeStamp()}||CI: Add localstream to peer for ${dstUser}...`);
    //peer.addTrack(localStream);
    for (const track of localStream.getTracks()) {
        peer.addTrack(track,localStream);
    }
    console.log(`${timeStamp()}||CI: Creating offer for ${dstUser}... \ntrying...`);
    peer.createOffer(). //вот тут может понадобиться ставить параметры для sdp если нет локального потока
    then((sessionDescription) => {
        peer.setLocalDescription(sessionDescription);
        console.log(`${timeStamp()}||CI: Session description setting for ${dstUser}: \n`, sessionDescription);
        let sigId = makeId(10);
        console.log(`${timeStamp()}||TX: ${socket.id} -> ${dstUser} _sigCalling::${sigId}.1`);
        socket.emit('_sigCalling', sigId, socket.id, dstUser, 1, sessionDescription);
    })
    
    //doCall(dstUser);
}

function answerPeerCall(dstUser, peer){
    console.log(`${timeStamp()}||CI: Answering on call from ${dstUser}...`);
    let data;
    data = {
        offerToReceiveAudio: false, 
        offerToReceiveVideo: false
    }
    //peer.createAnswer(data).
    peer.createAnswer().
    then ((sessionDescription) => {
        peer.setLocalDescription(sessionDescription);
        console.log('peerconn answ:', peer.localDescription);
        let sigId = makeId(10);
        console.log(`${timeStamp()}||TX: ${socket.id} -> ${dstUser} _sigCalling::${sigId}.3`);
        socket.emit('_sigCalling', sigId, socket.id, dstUser, 3, sessionDescription);
    }).
    catch((err) => {
        console.log(`${timeStamp()}||CI: Failed answer on call from ${dstUser} \n`, err);
    })
}

function createPeerConnection(pcConfig, dstUser) {
    try{
        let pc = new RTCPeerConnection(pcConfig);
        //pc.ondatachannel = handleChannelCallback;
        pc.addEventListener('track', (event) => handleRemoteStreamAdded(event, dstUser));
        pc.addEventListener('icecandidate', (event)=>handleIceCandidate(event, dstUser));
        pc.addEventListener('removetrack', (event) => handleRemoteStreamRemoved(event, dstUser));
        //console.log('created peer', pc);
        return pc;
    }
    catch(err){
        console.log('Failed to create PeerConnection, exception: ' + err.message);
        return;
    }
}

//End web elements handlers

//Socket events handlers:
//socket.on('_sigJoined', (extCode, user, users) => {
socket.on('_sigJoined', (sigId, from, to, type, data) => {
    console.log('dd: ',data);
    switch (type) {
        case 2:
            console.log('2:');
            if (data.user.isOwner){
                console.log(`User ${userNick}/${from} has created room ${data.user.room}. Is owner = ${data.user.isOwner}`);
            } else {
                console.log(`User ${userNick}//${from} had joined room ${data.user.room}. Is owner = ${data.user.isOwner}`);
                //isChannelReady = true;
                //isReady = true;

            }
            isOwner = data.user.isOwner;
            addUserToList(data.user.nick, isOwner);
            //mates.push(user);
            console.log(`dd: `,data.users);
            data.users.forEach(element => {
                addUserToList(element.nick, element.isOwner);
                mates.push(element);
                console.log(`dd2: ${element.id}//${element.nick}`);
                //peerConnections.set(element.id, createPeerConnection(pcConfig, element.id));
                peerConnections.set(element.id, {userId: element.id, peer: createPeerConnection(pcConfig, element.id)});
                //dataChannels.set(element.id, createPeerDataChannel(peerConnections.get(element.id)));
                console.log(`peer for ${element.id}: \n`, peerConnections.get(element.id).peer);
                //console.log(`peerDC for ${element.id}: \n`, dataChannels.get(element.id));
            });
            //console.log(`In room:`);
            //console.log(mates);
        break;
        case 4:
            console.log('4:');
            addUserToList(data.user.nick, data.user.isOwner);
            console.log(`joined:\n`,data.user);
            //peerConnections.set(data.user.id, createPeerConnection(pcConfig, data.user.id));
            peerConnections.set(data.user.id, {userId: data.user.id, peer: createPeerConnection(pcConfig, data.user.id)});
            //dataChannels.set(user.id, createPeerDataChannel(user.id, peerConnections.get('user.id')));
            console.log(`peer for ${data.user.id}: \n`, peerConnections.get(data.user.id).peer);
            //console.log(`peerDC for ${user.id}: \n`, dataChannels.get('user.id'));
            mates.push(data.user);
            console.log('dd4: ', mates)
            if (localStream!==undefined) {
                console.log(localStream);
                console.log(`create peer for ${data.user.nick}/${data.user.id}`);
                //peerConnections.set(user.id, createPeerConnection(pcConfig))
                //peerConnections.get(user.id).addStream(localStream);
                //console.log(peerConnections.get(user.id));
                //doP2Pcall(peerConnections.get(user.id));
            }
            //console.log(mates);
            //console.log(`dd: ${user.id}//${user.nick}\n `,peerConnections.get(user.id));
            //doP2Pcall(peerConnections.get(user.id),user.id);
            
        break
    }



});

//socket.on('_chatMessage', (roomId,user,msg) =>{
socket.on('_chatMessage',  (sigId, from, to, type, data) => {
    //console.log(`new message: ${user}->${msg}`);
    console.log(`${timeStamp()}||RX: _chatMessage${from} -> ${to} _sigEnter::${sigId}.${type}:`);
    console.log(`${data.userNick}:\n`+data.text);
    addChatMessage(data.text, data.userNick, timeStampShort(), 'remote');
});

//socket.on('_sigDisconnected', (disconnectedUser) => {
socket.on('_sigDisconnected', (sigId, from, to, type, data) => {
    console.log(`${timeStamp()}||RX: ${from} -> ${to} _sigDisconnected::${sigId}.${type}`);
    //console.log(data.disconnectedUser);

    tempuser = data.disconnectedUser;
    //mates.indexOf(mates.findByValueOfObject('id', tempuser.id)[0]);
    //mates.splice(mates.findIndex(mates.indexOf(mates.findByValueOfObject('id', tempuser.id)[0])),1);
    
    mates.splice(mates.indexOf(mates.findByValueOfObject('id', tempuser.id)[0]),1);
    removeUserFromList(tempuser.nick);
    peerConnections.delete(tempuser.id);
    //dataChannels.delete(tempuser.id);
    console.log(`User ${data.disconnectedUser.nick} left the room ${data.disconnectedUser.room}`);
    // ADD notification to chat
});

socket.on('_sigCalling', (sigId, from, to, type, data) => {
    console.log(`${timeStamp()}||RX: ${from} -> ${to} _sigCalling::${sigId}.${type}//${data.type} with SDP:\n`, data);
    //io.to(to).emit('_sigCalling', sigId, socket.id, dstUser, 2, data);
    //console.log(`${tools.timeStamp()}||TX: ${from} -> ${to} _sigCalling::${sigId}.2//${data.type}`);
    switch (data.type){
        case 'offer':
            console.log(`${timeStamp()}||CI: Received offer from ${from}... \nanswering...`);
            //а что если нет локального медиа?
            console.log(`${timeStamp()}||CI: Create local SDP...`);
            peerConnections.get(from).peer.setRemoteDescription(new RTCSessionDescription(data));
            answerPeerCall(from, peerConnections.get(from).peer);
            //startPeerCall(element.userId, element.peer);
        break;
        case 'answer':
            console.log(`${timeStamp()}||CI: Received answer from ${from}`);
            peerConnections.get(from).peer.setRemoteDescription(new RTCSessionDescription(data));
        break;
        case 'candidate':
            console.log(`${timeStamp()}||CI: Received candidate from ${from}`);
            let candidate = new RTCIceCandidate({
                sdpMLineIndex: data.label,
                candidate: data.candidate
            });
            peerConnections.get(from).peer.addIceCandidate(candidate);
        break;
        default:
        break;
    }
});





//Event handlers:
function handleIceCandidate(event, dstUser) {
    console.log(`icecandidate event for ${dstUser}: `, event);
    if (event.candidate) {
        console.log(`dd: \n` , event);
        //socket.emit('_sigMessage',{
        let sigId = makeId(10)
        console.log(`${timeStamp()} TX -> _sigCandidate.1::${sigId} from ${socket.id} to ${dstUser}`);
        socket.emit('_sigCandidate', sigId, socket.id, dstUser, 1, {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate});
    } else {
        console.log('End of candidates.');	
    }
}
var rstream;
function handleRemoteStreamAdded(event, dstUser){
    remoteStreams.set(dstUser, event.stream); 
    console.log('ddd video: ', dstUser,`\n`,event);
    //addVideoElement(`${dstUser}::${event.stream.id}`).srcObject=event.stream;
    //addVideoElement(`${dstUser}::${makeId(4)}`).srcObject=event.stream;  
    rstream = event.streams[0];
    console.log('ddd rstream', event.streams[0]);
    addVideoElement(`vels${dstUser}::${event.streams[0].id}`).srcObject=event.streams[0];  
    //localVideoElement.srcObject = event.streams[0];
    //console.log(`Remote stream added ${event.stream.id}`);
    console.log(`Remote stream added`);
}

function handleRemoteStreamRemoved(event, dstUser){
    console.log('Remote stream removed. Event: ', event);
    remoteStreams.delete(dstUser);
    removeVideoElement(`vel${dstUser}::${event.stream.id}`);
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