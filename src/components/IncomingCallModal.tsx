import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  callType: 'video' | 'voice';
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({
  isOpen,
  callerName,
  callerAvatar,
  callType,
  onAccept,
  onDecline
}: IncomingCallModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-sm p-8 bg-gradient-to-br from-primary/10 to-secondary/10">
        <div className="text-center">
          {/* Avatar */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold shadow-xl animate-pulse">
              {callerAvatar ? (
                <img src={callerAvatar} alt={callerName} className="w-full h-full rounded-full object-cover" />
              ) : (
                callerName.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          {/* Caller Info */}
          <h3 className="text-2xl font-bold text-foreground mb-2">{callerName}</h3>
          <p className="text-muted-foreground mb-8">
            Incoming {callType} call...
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-6">
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
              onClick={onDecline}
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </Button>

            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
              onClick={onAccept}
            >
              {callType === 'video' ? (
                <Video className="w-7 h-7 text-white" />
              ) : (
                <Phone className="w-7 h-7 text-white" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
