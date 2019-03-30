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
