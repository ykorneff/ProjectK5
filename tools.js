'use strickt';

const ERROR = '[ERROR]';
const WARN = '[WARNING]';
const NOTE = '[NOTE]';
const INFO = '[INFO]';
const DEBUG = '[DEBUG]';
const EXTRA = '[EXTRA DEBUG]'

let levels = new Map();
levels.set(1, ERROR);
levels.set(2, WARN);
levels.set(3, NOTE);
levels.set(4, INFO);
levels.set(5, DEBUG);
levels.set(6, EXTRA);

timeStamp = function (){
    let now = new Date(Date.now());
    return `<${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}>`;
}
module.exports = {
    timeStamp: function (){
        let now = new Date(Date.now());
        return `<${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}>`;
    },
    
    leveledTrace: function  (message, level, traceLevel) {
        if (level<=traceLevel) {
            console.log(`${timeStamp()}${levels.get(level)}::${message}`);
        }
    },
    doTrace: function (message, level, traceLevel){
        if (level <= traceLevel) {
           if (typeof message === 'object'){
                console.log(`${timeStamp()}${levels.get(level)}::`);
                console.log(message);
            }else {
                console.log(`${timeStamp()}${levels.get(level)}::${message}`);
            }
        }
        
    }
    
}
