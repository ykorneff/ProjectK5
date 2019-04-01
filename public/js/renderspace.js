'use strict';

document.getElementById('spaceTitleId').textContent=`Project K5. Room: ${roomId}, user: ${userNick}`;


function videoTest(){
    navigator.mediaDevices.getUserMedia({video: true})
    .then((stream)=>{
        document.getElementById('localVideo').srcObject=stream;
        document.getElementById('video1').srcObject=stream;
        document.getElementById('video2').srcObject=stream;
        document.getElementById('video3').srcObject=stream;
        document.getElementById('video4').srcObject=stream;
    })
    .catch ((err)=>{
        console.log(err);
    });
}

function addChatMessage(text, user, time, messageClass){
    document.getElementById('textToSend').focus();
    let chatArea = document.getElementById('chatArea');
    let pLabel = document.createElement("P");
    let pMsg = document.createElement("P");
    pLabel.className = `${messageClass}Label`;
    pMsg.className = messageClass;
    pLabel.textContent = `${user}, ${time} `;
    pMsg.textContent = text;
    chatArea.appendChild(pLabel);
    chatArea.appendChild(pMsg);
    chatArea.appendChild(document.createElement("BR"));
    pMsg.scrollIntoView();
    //document.getElementById('textToSend').focus();
    console.log(`MSG::${user}@${time}:${text}`);
}

function addUserToList(user, isOwner){
    let userListElement = document.getElementById('userList');
    let userItem = document.createElement("LI");
    let aUser = document.createElement("A");
    //let isOwnerMarker = 
    aUser.id = `aItem${user}`;
    aUser.href = 'javascript:void(0)';
    aUser.onclick = function(){console.log(`click ${aUser.id}`)};
    aUser.textContent = user;
    if(isOwner) {
        aUser.style='font-weight:bold';
    }
    userItem.id=`uItem${user}`;
    userItem.appendChild(aUser);
    userListElement.appendChild(userItem);

}

function removeUserFromList(user) {
    let userListElement = document.getElementById('userList');
    let userItem = document.getElementById(`uItem${user}`);
    //let aUser = document.getElementById(`aItem${user}`);

    //userItem.removeChild(aUser);
    userListElement.removeChild(userItem);
}