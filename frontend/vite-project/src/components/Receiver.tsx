import React, { useEffect, useRef, useState, useCallback } from "react";
import VideoCallPrompt from "./videoCallPrompt";

export const Receiver: React.FC = () => {
  const [isStart, setIsStart] = useState(false);
  const [accept, setAccept] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const onDecline = useCallback(() => {
    console.log("onDecline called");
    setAccept(false);
    setIsDialogOpen(false);
    socketRef.current?.send(JSON.stringify({ type: 'videoCallOfferDeclined' }));
  }, []);

  const onAccept = useCallback(() => {
    console.log("onAccept called");
    setAccept(true);
    setIsDialogOpen(false);
    socketRef.current?.send(JSON.stringify({ type: 'videoCallOfferAccepted' }));
    

  }, []);

  useEffect(() => {
    socketRef.current = new WebSocket('ws://localhost:8080');

    socketRef.current.onopen = () => {
      socketRef.current?.send(JSON.stringify({ type: 'receiver' }));
    };

    socketRef.current.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'videoCallOffer':
          console.log("reached receiver");
          setIsStart(true);
          setIsDialogOpen(true);
          break;

        case 'createOffer':
          if (accept) {
            peerConnectionRef.current = new RTCPeerConnection();
            const pc = peerConnectionRef.current;

            pc.onicecandidate = (event) => {
              if (event.candidate) {
                socketRef.current?.send(JSON.stringify({ type: 'iceCandidate', candidate: event.candidate }));
              }
            };

            pc.ontrack = (event) => {
              if (videoRef.current) {
                videoRef.current.srcObject = new MediaStream([event.track]);
                videoRef.current.play().catch(e => console.error("Error playing video:", e));
              }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socketRef.current?.send(JSON.stringify({ type: "createAnswer", sdp: pc.localDescription }));
          }
          break;

        case 'iceCandidate':
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
          }
          break;
      }
    };

    return () => {
      socketRef.current?.close();
    };
  }, [accept]);

  return (
    <div>
      {isStart && (
        <VideoCallPrompt
          callerName="Dilshad Azam"
          isOpen={isDialogOpen}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      )}
      <video ref={videoRef} />
    </div>
  );
};