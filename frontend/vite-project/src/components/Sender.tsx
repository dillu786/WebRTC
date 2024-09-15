import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "./ui/button";
export function stopMediaDevices() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      .then(stream => {
        const tracks = stream.getTracks();
        
        tracks.forEach(track => {
          track.stop();
          console.log(`${track.kind} track stopped`);
        });
        
        console.log('Camera and microphone closed successfully');
      })
      .catch(err => {
        console.error('Error closing camera and microphone:', err);
      });
  }
  
export function Sender() {
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const socketRef = useRef<WebSocket >( new WebSocket('ws://localhost:8080'));
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

    useEffect(() => {
       // socketRef.current = new WebSocket('ws://localhost:8080');
        peerConnectionRef.current = new RTCPeerConnection();

        socketRef.current.onopen = () => {
            setIsConnected(true);
            socketRef.current?.send(JSON.stringify({ type: 'sender' }));
        };

        // socketRef.current.onclose = () => {
        //     setIsConnected(false);
        // };

        socketRef.current.onmessage = handleWebSocketMessage;

        // return () => {
        //     socketRef.current?.close();
        //     peerConnectionRef.current?.close();
        // };
    }, []);

 
      // Call this function when you want to close both camera and microphone
      function stopMediaDevices() {
        navigator.mediaDevices.getUserMedia({ audio: true, video: true })
          .then(stream => {
            const tracks = stream.getTracks();
            if(localVideoRef && localVideoRef.current)
            localVideoRef.current.srcObject=null;
            tracks.forEach(track => {
              track.stop();
              console.log(`${track.kind} track stopped`);
            });
            
            console.log('Camera and microphone closed successfully');
          })


          .catch(err => {
            console.error('Error closing camera and microphone:', err);
          });
      }
      
    const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case "videoCallOfferAccepted":
                console.log("Received videoCallOfferAccepted");
                startSendingVideo();
                break;
            case "createOffer":
                console.log("Create offer reached sender from receiver");
                await handleCreateOffer(message);
                break;
            case "createAnswer":
                await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(message.sdp));
                break;
            case "iceCandidate":
                await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(message.candidate));
                break;
        }
    }, []);

    const handleCreateOffer = useCallback(async (message: any) => {
        if (!peerConnectionRef.current) return;

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current?.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
            }
        };

        peerConnectionRef.current.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = new MediaStream([event.track]);
                remoteVideoRef.current.play().catch(e => console.error("Error playing remote video:", e));
            }
        };
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.sdp));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socketRef.current?.send(JSON.stringify({ type: "createAnswerSender", sdp: peerConnectionRef.current.localDescription }));
    }, []);

    const askForVideoCall = useCallback(() => {
        if (!socketRef.current) return;
        console.log("Requesting video call");
        socketRef.current.send(JSON.stringify({ type: "videoCallOffer" }));
    }, []);

    const startSendingVideo = useCallback(async () => {
        console.log('Starting video transmission');
        if (!socketRef.current || !peerConnectionRef.current) return;

        peerConnectionRef.current.onnegotiationneeded = async () => {
            console.log("Negotiation needed");
            try {
                if (!peerConnectionRef.current) return;
                const offer = await peerConnectionRef.current.createOffer();
                await peerConnectionRef.current.setLocalDescription(offer);
                socketRef.current?.send(JSON.stringify({ type: "createOffer", sdp: peerConnectionRef.current.localDescription }));
            } catch (error) {
                console.error("Error during negotiation:", error);
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(track => peerConnectionRef.current?.addTrack(track, stream));

            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play();
            }
            setIsStreaming(true);
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
             <div className="mb-4 text-xl font-bold">Video Call Sender</div>
            <Button onClick={askForVideoCall} disabled={!isConnected || isStreaming}>
                {isStreaming ? "Streaming" : "Send Video"}
            </Button>
         
           
      <div className="flex space-x-4">
        <div className="flex flex-col items-center">
          <div className="mb-2 font-semibold">Remote Video</div>
          <video ref={remoteVideoRef} className="w-64 h-48 bg-black" playsInline />
        </div>
        <div className="flex flex-col items-center">
          <div className="mb-2 font-semibold">Local Video</div>
          <video ref={localVideoRef} className="w-64 h-48 bg-black" playsInline  />
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-600">
        {isConnected ? 'Connected to server' : 'Disconnected from server'}
      </div>
      <div className="mt-4 text-gray-500">
       {isStreaming && <Button onClick={async()=>{
        peerConnectionRef.current?.close()
            stopMediaDevices();
        }}>EndCall</Button>}
      </div>
    </div>
    
    );
}