const http = require('http');
const WebSocket = require('ws');
const express = require('express');

const socketGroups = {};
let wss;

function wsInit( server, ws_server_config  ){

    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req)=>{

        console.log("new connection")

        ws.on('message', (message)=>{
            try{
                message = JSON.parse(message);
            }catch(e){console.error(e);}

            if( message.response_device ){
                ws.device_name = message.response_device.device_name;
                ws.device_group = message.response_device.device_group;
                ws.token = message.response_device.token;
            }else{ console.warn("message.response_device is not set!"); }

            // console.log("message");
            // console.log(message);

            if( message.send_to_device && message.send_to_device.uid ){
                resolveSocket(message.send_to_device.uid, message);
            }else{
                
            }

        });
    });

    return {sendToSockets};
}

export default wsInit;

let uidResolveTracker = {};
async function sendToSockets(objToSend, incoming_token, device, group){

    if( typeof objToSend !== 'object' ){
        throw "objToSend must be an object";
    }
    
    try{

        let promiseArr = [];

        let i=0;
        wss.clients.forEach(function (ws){

            if( incoming_token === ws.token ){

                objToSend.send_to_device = {};

                objToSend.send_to_device.uid = Math.random(); // for each socket set its own uid 
                objToSend.send_to_device.index = i++;

                //console.log(objToSend)

                let strToSend = JSON.stringify(objToSend);

                promiseArr.push(new Promise((resolve, reject)=>{
                    ws.send( strToSend );
                    uidResolveTracker[objToSend.send_to_device.uid] = resolve;
                    //resolve("work")
                }));
            }else{
                console.log("token check failed for "+ws.device_name);
                console.log("ws.token "+ws.token);
                console.log("incoming_token "+incoming_token);
            }

        });

        return await Promise.all( promiseArr );

    }catch(e){
        console.log("heyyyy");
        console.log(e);
        return [];
    }
    
}

function resolveSocket(uid, data){
    if( !uidResolveTracker[uid] ){
        console.warn("uidResolveTracker[uid] is not defined)");
    }else if( !data ){
        console.warn("data is not defined");
    }else{
        // console.log("ws 87 resolving "+uid);
        // console.log("typeof uidResolveTracker[uid] "+typeof uidResolveTracker[uid]);
        uidResolveTracker[uid]( data );
    }
}

function getUid( message ){
    return message.uid
}

console.log("websocket server done")