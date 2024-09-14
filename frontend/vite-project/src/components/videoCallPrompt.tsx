import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { Button } from "../components/ui/button";
import { Phone, PhoneOff } from "lucide-react";

interface VideoCallPromptProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  callerName: string;
}

const VideoCallPrompt: React.FC<VideoCallPromptProps> = ({
  isOpen,
  onAccept,
  onDecline,
  callerName,
}) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Incoming Video Call</AlertDialogTitle>
          <AlertDialogDescription>
            {callerName} is calling you. Would you like to accept the video call?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDecline}>
            <Button variant="outline">
              <PhoneOff className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>
            <Button variant="default">
              <Phone className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default VideoCallPrompt;