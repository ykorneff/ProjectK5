//import './app.css';
const traceLevel = 7;
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
    tools.doTrace(req,5);
    res.sendFile(`${__dirname}/html/space.html`);
});
/*
app.get('/chat', function(req, res){
    res.sendFile(`${__dirname}/chat.html` );
});

app.get('/vchat', (req,res) => {
    console.log(req);
    res.sendFile(`${__dirname}/vchat.html` );
});
*/

/*
io.on('connection', function(socket){

    socket.on('_sigMessage', (msg)=>{
        console.log(`_sigMessage ${msg.type}`);
        io.emit('_sigMessage', msg);
    });

});

io.emit('some event', {for: 'evereyone'});
*/

https.listen(3001, function(){
    tools.doTrace('listening on port 3001',3);
});

console.log(``);
tools.doTrace('K5 started',3);


/*
http.listen(3000, function(){
    console.log('listening on port 3000');
})
*/
