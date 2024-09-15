import React, { useEffect, useRef, useState, useCallback } from "react";
import VideoCallPrompt from "./videoCallPrompt";
import { Button } from "./ui/button";
import { stopMediaDevices } from "./Sender";
import { Maximize2, Minimize2 } from 'lucide-react';
export const Receiver = () => {
  const [isCallOffered, setIsCallOffered] = useState(false);
  const [isStreaming,setIsStreaming]=useState(false);
  const [isCallAccepted, setIsCallAccepted] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket >(new WebSocket('ws://localhost:8080'));
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [isLocalFullscreen, setIsLocalFullscreen] = useState(false);

  const onDecline = useCallback(() => {
    console.log("Call declined");
    setIsCallAccepted(false);
    setIsDialogOpen(false);
    socketRef.current?.send(JSON.stringify({ type: 'videoCallOfferDeclined' }));
  }, []);

  const onAccept = useCallback(() => {
    console.log("Call accepted");
    setIsCallAccepted(true);
    setIsDialogOpen(false);
    setIsStreaming(true);
    socketRef.current?.send(JSON.stringify({ type: 'videoCallOfferAccepted' }));
    startLocalStream();
  }, []);

  const startLocalStream = useCallback(async () => {
    console.log('Starting local video stream');
    if (!socketRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play();
      }

      peerConnectionRef.current = new RTCPeerConnection();
      const pc = peerConnectionRef.current;

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current?.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = new MediaStream([event.track]);
          remoteVideoRef.current.play().catch(e => console.error("Error playing remote video:", e));
        }
      };

      pc.onnegotiationneeded = async () => {
        console.log("Negotiation needed from receiver");
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socketRef.current?.send(JSON.stringify({ type: "createOfferReceiver", sdp: pc.localDescription }));
        } catch (error) {
          console.error("Error during negotiation:", error);
        }
      };
    } catch (error) {
      console.error("Error accessing media devices:", error);
    }
  }, []);
  const toggleLocalFullscreen = () => {
    if (!document.fullscreenElement) {
        localVideoRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
};
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    const message = JSON.parse(event.data);
    console.log('Received message:', message.type);

    switch (message.type) {
      case 'videoCallOffer':
        setIsCallOffered(true);
        setIsDialogOpen(true);
        break;

      case 'createOffer':
        if (isCallAccepted && peerConnectionRef.current) {
          const pc = peerConnectionRef.current;
          await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current?.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }));
        }
        break;

      case 'createAnswer':
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.sdp));
        }
        break;

      case 'iceCandidate':
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
        }
        break;
      case "endCall":
           peerConnectionRef.current?.close();
           if(localVideoRef && localVideoRef.current)
             stopMediaDevices();
           if(localVideoRef && localVideoRef.current)
            localVideoRef.current.srcObject=null;
           break;
      
    }
  }, [isCallAccepted]);
  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsLocalFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
}, []);
  useEffect(() => {
    
    peerConnectionRef.current = new RTCPeerConnection();
    socketRef.current.onopen = () => {
      setIsConnected(true);
      socketRef.current?.send(JSON.stringify({ type: 'receiver' }));
    };

    // socketRef.current.onclose = () => {
    //   setIsConnected(false);
    // };

    socketRef.current.onmessage = handleWebSocketMessage;

    // return () => {
    //   console.log("component unmounted");
    //   socketRef.current?.close();
    //   peerConnectionRef.current?.close();
    // };
  }, [handleWebSocketMessage]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {isCallOffered && (
        <VideoCallPrompt
          callerName="Dilshad Azam"
          isOpen={isDialogOpen}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      )}
       <div className="flex space-x-4">
                <div className="flex flex-col items-center">
                    <div className="mb-2 font-semibold">Remote Video</div>
                    <div className="relative">
                    <video ref={remoteVideoRef} className="w-48 h-64 bg-black" playsInline />
                    <button
                            onClick={toggleLocalFullscreen}
                            className="absolute bottom-2 right-2 bg-white bg-opacity-50 p-1 rounded-full hover:bg-opacity-75 transition-opacity"
                        >
                            {isLocalFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>
                    
                </div>
                <div className="flex flex-col items-center">
                    <div className="mb-2 font-semibold">Local Video</div>
                    <div className="relative">
                        <video ref={localVideoRef} className="w-48 h-64 bg-black" playsInline />
                        <button
                            onClick={toggleLocalFullscreen}
                            className="absolute bottom-2 right-2 bg-white bg-opacity-50 p-1 rounded-full hover:bg-opacity-75 transition-opacity"
                        >
                            {isLocalFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                        </button>
                    </div>
                </div>
            </div>
      <div className="mt-4 text-sm text-gray-600">
        {isConnected ? 'Connected to server' : 'Disconnected from server'}
      </div>
      <div className="mt-4 text-sm text-gray-600">
        {isStreaming && <Button onClick={async()=>{
            peerConnectionRef.current?.close();
            stopMediaDevices();
            if(localVideoRef && localVideoRef.current)
                localVideoRef.current.srcObject=null;
              socketRef.current.send(JSON.stringify({type:"endCall"}));
            }}>EndCall</Button>}
      </div>
    </div>
  );
};