import React, { useEffect, useRef, useState, useCallback } from "react";
import VideoCallPrompt from "./videoCallPrompt";
import { Button } from "./ui/button";
import { stopMediaDevices } from "./Sender";
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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
    }
  }, [isCallAccepted]);

  useEffect(() => {
    

    socketRef.current.onopen = () => {
      setIsConnected(true);
      socketRef.current?.send(JSON.stringify({ type: 'receiver' }));
    };

    // socketRef.current.onclose = () => {
    //   setIsConnected(false);
    // };

    socketRef.current.onmessage = handleWebSocketMessage;

    // return () => {
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
      <div className="mb-4 text-xl font-bold">Video Call Receiver</div>
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
      <div className="mt-4 text-sm text-gray-600">
        {isStreaming && <Button onClick={async()=>{
            peerConnectionRef.current?.close();
            stopMediaDevices();
            if(localVideoRef && localVideoRef.current)
                localVideoRef.current.srcObject=null;
            }}>EndCall</Button>}
      </div>
    </div>
  );
};