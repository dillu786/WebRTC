import { useEffect, useState,useRef } from "react";
import { Button } from "./ui/button";

export function Sender() {
    const socketRef=useRef(new WebSocket('ws://localhost:8080'));
    const videoRef=useRef<HTMLVideoElement|null>(null)
    useEffect(() => {
       // const ws = new WebSocket("ws://localhost:8080");

        socketRef.current.onopen = () => {
            socketRef.current.send(JSON.stringify({ type: 'sender' }));
        };

        socketRef.current.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === "videoCallOfferAccepted") {
                console.log("Received videoCallOfferAccepted");
                console.log(socketRef.current);
                startSendingVideo();
            }
        };

       // setSocket(ws);

      
    }, []);

    function askForVideoCall() {
        if (!socketRef.current) return;
        console.log("Requesting video call");
        socketRef.current.send(JSON.stringify({ type: "videoCallOffer" }));
    }

    async function startSendingVideo() {
        console.log('Starting video transmission');
        console.log(socketRef.current);
        if (!socketRef.current) return;
        console.log('Starting video transmission2');
        const pc = new RTCPeerConnection();

        pc.onnegotiationneeded = async () => {
            console.log("Negotiation needed");
            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socketRef.current.send(JSON.stringify({ type: "createOffer", sdp: pc.localDescription }));
            } catch (error) {
                console.error("Error during negotiation:", error);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
            }
        };

        socketRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "createAnswer") {
                pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === "iceCandidate") {
                pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            pc.addTrack(stream.getVideoTracks()[0]);

            // const video = document.createElement('video');
            // document.body.appendChild(video);
            if(videoRef.current){
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
          
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    }

    return (
        <div className="flex justify-center w-full h-screen items-center flex-col">
            Sender
            <Button onClick={askForVideoCall}>Send Video</Button>
            <video ref={videoRef} src=""></video>
        </div>
    );
}
