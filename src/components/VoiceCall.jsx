import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const VoiceCall = ({ otherUser, user, onEndCall, incomingOffer }) => {
  const [callStatus, setCallStatus] = useState(incomingOffer ? 'incoming' : 'calling');
  const [localStream, setLocalStream] = useState(null);
  const peerConnection = useRef(null);
  const socket = useRef(null);
  const remoteAudioRef = useRef(null);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ]
  };

  useEffect(() => {
    socket.current = io('http://localhost:5001');
    socket.current.emit('register', user.id);

    socket.current.on('call-answered', async ({ answer }) => {
      console.log('Call answered');
      await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      setCallStatus('connected');
    });

    socket.current.on('ice-candidate', async ({ candidate }) => {
      console.log('New ICE candidate');
      try {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ice candidate', e);
      }
    });

    socket.current.on('call-ended', () => {
      endCall();
    });

    const initCall = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      peerConnection.current = new RTCPeerConnection(configuration);
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate) {
          socket.current.emit('ice-candidate', { to: otherUser.id, candidate: event.candidate });
        }
      };

      peerConnection.current.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      if (incomingOffer) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);
        socket.current.emit('answer-call', { to: otherUser.id, answer });
        setCallStatus('connected');
      } else {
        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);
        socket.current.emit('call-user', { to: otherUser.id, from: user.id, offer });
      }
    };

    initCall().catch(err => {
      console.error('Failed to init call:', err);
      onEndCall();
    });

    return () => {
      endCall();
    };
  }, []);

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (socket.current) {
      socket.current.emit('end-call', { to: otherUser.id });
      socket.current.disconnect();
    }
    onEndCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/95 backdrop-blur-xl animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-sm p-8 text-center space-y-8">
        <div className="relative mx-auto size-32">
           <div className={`absolute inset-0 bg-primary/20 rounded-full animate-ping ${callStatus === 'connected' ? 'hidden' : ''}`}></div>
           <div className="relative size-full rounded-full bg-gradient-to-br from-primary to-purple-900 p-1 shadow-2xl">
              <div className="size-full rounded-full bg-card-dark flex items-center justify-center text-primary text-4xl font-bold">
                 {otherUser.username.charAt(0)}
              </div>
           </div>
        </div>

        <div className="space-y-2">
           <h2 className="text-3xl font-bold tracking-tight">{otherUser.username}</h2>
           <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs animate-pulse">
              {callStatus === 'calling' && 'Initiating Secure Link...'}
              {callStatus === 'incoming' && 'Incoming Secure Link...'}
              {callStatus === 'connected' && 'Link Established'}
           </p>
        </div>

        <div className="flex justify-center gap-6 pt-8">
           <button
             onClick={endCall}
             className="size-16 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-110 transition-transform active:scale-95"
           >
              <span className="material-symbols-outlined text-3xl rotate-[135deg]">call</span>
           </button>
        </div>

        <audio ref={remoteAudioRef} autoPlay />
      </div>
    </div>
  );
};

export default VoiceCall;
