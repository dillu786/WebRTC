import {WebSocket,WebSocketServer} from "ws";

const wss =new WebSocketServer({port:8080});
let senderSocket: WebSocket|null =null;
let receiverSocket:WebSocket|null=null;
wss.on("connection",(ws:WebSocket)=>{
    ws.on("message",(data:any)=>{
        const message=JSON.parse(data);
        //console.log(JSON.stringify(message));
        if(message.type==="sender"){
            senderSocket=ws;
            console.log('sender set');
            console.log('Hi');
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
        else if(message.type==="createOfferReceiver"){
            console.log("offer from receiver");
              if(ws===receiverSocket){
                console.log("inside if")
                senderSocket?.send(JSON.stringify({type:"createOffer",sdp:message.sdp}))
              }
        }
        else if(message.type==="createAnswerSender"){
            console.log("answer from sender");
            if(ws===senderSocket){
              console.log("inside if")
              receiverSocket?.send(JSON.stringify({type:"createOffer",sdp:message.sdp}))
            }
      }
        else if(message.type==="iceCandidate"){
            if(ws===receiverSocket){
                senderSocket?.send(JSON.stringify({type:"iceCandidate",candidate:message.candidate}));
            }
            else if(ws===senderSocket){
                receiverSocket?.send(JSON.stringify({type:"iceCandidate",candidate:message.candidate}));
            }
        }
        else if(message.type==="videoCallOffer"){
            console.log("videoCallOffer set");
            if(ws===senderSocket){
                console.log("inside sender condition")
                receiverSocket?.send(JSON.stringify({type:"videoCallOffer"}));
            }
        }
        else if(message.type==="videoCallOfferAccepted"){
            console.log("videoCallOfferAccepted set");
           // console.log(ws);
            if(ws===receiverSocket){
                console.log("sender called for video call");
                senderSocket?.send(JSON.stringify({type:"videoCallOfferAccepted"}));
            }
        }
        else if(message.type==="endCall"){
            if(ws===receiverSocket){
                senderSocket?.send(JSON.stringify({type:"endCall"}))
            }
            else if(ws===senderSocket){
                receiverSocket?.send(JSON.stringify({type:"endCall"}))
            }
        }
    })
})