import {WebSocket,WebSocketServer} from "ws";

const wss =new WebSocketServer({port:8080});
let senderSocket: WebSocket|null =null;
let receiverSocket:WebSocket|null=null;
wss.on("connection",(ws:WebSocket)=>{
    ws.on("message",(data:any)=>{
        const message=JSON.parse(data);
        if(message.type==="sender"){
            senderSocket=ws;
            console.log('sender set');
        }
        if(message.type==="receiver"){
            receiverSocket=ws;
            console.log("receiver set");
        }
        else if(message.type==="createOffer"){
            console.log('offer received');
           
            if(ws!=senderSocket){
                return
            }
            receiverSocket?.send(JSON.stringify({type:"createOffer",sdp:message.sdp}));
            console.log('offer created');
        }
        else if(message.type==="createAnswer"){
            console.log('answer received')
            if(ws!=receiverSocket){
                return
            }
            senderSocket?.send(JSON.stringify({type:"createAnswer",sdp:message.sdp}))
        }

        else if(message.type==="iceCandidate"){
            if(ws===receiverSocket){
                senderSocket?.send(JSON.stringify({type:"iceCandidate",candidate:message.candidate}));
            }
            else if(ws===senderSocket){
                receiverSocket?.send(JSON.stringify({type:"iceCandidate",candidate:message.candidate}));
            }
        }
    })
})