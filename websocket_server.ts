const http = require('http');
const WebSocket = require('ws');
const express = require('express');

const socketGroups = {};
let wss;
let pingInterval = 1000*60; // 1 min

function wsInit( server, ws_server_config  ){

    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws, req)=>{

        console.log("new connection")

        ws.isAlive = true;

        ws.on('message', (message)=>{
            try{
                message = JSON.parse(message);
            }catch(e){
                console.error(e);
                return;
            }

            if( message.response_device ){
                if ( check_message_response_device( message.response_device ) ){
                    ws.device_name = message.response_device.device_name;
                    ws.device_group = message.response_device.device_group;
                    ws.token = message.response_device.token;
                    ws.token_type = message.response_device.token_type || "string";
                    console.log("ws.device_name set "+ws.device_name)
                }
            }else{ console.warn("message.response_device is not set!"); }

            ws.check_token = (inStr)=>{

                let toReturn;

                if(ws.token_type === "regex"){ // if this is defined then you know you have executed the if currently on line 23 where it is set
                    if( !ws.token_regex ){
                        ws.token_regex = new RegExp(ws.token);
                    }

                    toReturn = ws.token_regex.test(inStr);
                }else if( ws.token_type === "string" ){
                    console.warn("Not a regex; ws.device_name "+ws.device_name+" ws.device_group "+ws.device_group);
                    toReturn = inStr === inStr;
                }else{
                    throw "websocket_server.ts 48 EEEEEKKKK"
                }

                if(toReturn===undefined){throw "wss 45 toReturn must be set"};
                return toReturn;
            };

            if( message.send_to_device && message.send_to_device.uid ){
                resolveSocket(message.send_to_device.uid, message);
            }else{
                
            }

        });


        let pingInterval_id = setInterval(()=>{
            
            if (ws.isAlive === false) {

                clearInterval(pingInterval_id);
                ws.terminate();

            }else{
                
                ws.isAlive = false;
                let o = {
                    "ws_server_ping":true,
                    "errors":{}, // put app the error happened in
                    "date":new Date()
                };

                ws.ping(JSON.stringify(o));
            }
            
        },pingInterval)

        ws.on('pong', ()=>{ws.isAlive = true});

        ws.on('close', ()=>{
            console.log(ws.device_name+' disconnected');
        });
    });

    console.log("wsInit done")
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

            if( ws.check_token(incoming_token) ){

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

            if( promiseArr.length === 0 ){
                promiseArr.push(async ()=>{
                    return {"error":"Not sending to any socket. Could be token issue or socket connection issue."};
                })
            }

        });

        return await Promise.all( promiseArr );

    }catch(e){
        console.log("heyyyy");
        console.log(e);
        return [];
    }
    
}

function check_message_response_device( response_device ){
    // TODO fill out
    return true;
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