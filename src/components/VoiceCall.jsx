import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc } from 'firebase/firestore';
import { wrapSetDoc, wrapUpdateDoc, wrapAddDoc, wrapOnSnapshot } from '../utils/firebaseMock';

const VoiceCall = ({ otherUser, user, onEndCall, incomingOffer, callId: initialCallId, groupId }) => {
  const [callStatus, setCallStatus] = useState(incomingOffer ? 'incoming' : 'calling');
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const peerConnection = useRef(null);
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const [callId, setCallId] = useState(initialCallId);

  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
    ]
  };

  useEffect(() => {
    let unsubscribe;
    let unsubscribeOfferCandidates;
    let unsubscribeAnswerCandidates;

    const initCall = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      peerConnection.current = new RTCPeerConnection(configuration);
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      let currentCallId = initialCallId;

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && currentCallId && groupId) {
          const collectionName = incomingOffer ? 'answerCandidates' : 'offerCandidates';
          wrapAddDoc(addDoc, collection(db, 'groups', groupId, 'calls', currentCallId, collectionName), event.candidate.toJSON());
        }
      };

      peerConnection.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      if (incomingOffer) {
        setCallId(initialCallId);

        // Listen for offer candidates
        unsubscribeOfferCandidates = wrapOnSnapshot(onSnapshot, collection(db, 'groups', groupId, 'calls', initialCallId, 'offerCandidates'), (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });

        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(incomingOffer));
        const answer = await peerConnection.current.createAnswer();
        await peerConnection.current.setLocalDescription(answer);

        await wrapUpdateDoc(updateDoc, doc(db, 'groups', groupId, 'calls', initialCallId), {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected'
        });
        setCallStatus('connected');

        unsubscribe = wrapOnSnapshot(onSnapshot, doc(db, 'groups', groupId, 'calls', initialCallId), (snapshot) => {
           if (!snapshot.exists() || snapshot.data().status === 'ended') {
              endCall();
           }
        });

      } else {
        const callDocRef = doc(collection(db, 'groups', groupId, 'calls'));
        currentCallId = callDocRef.id;
        setCallId(currentCallId);

        const offer = await peerConnection.current.createOffer();
        await peerConnection.current.setLocalDescription(offer);

        await setDoc(callDocRef, {
          from: user.uid,
          to: otherUser.id,
          offer: { type: offer.type, sdp: offer.sdp },
          status: 'ringing',
          createdAt: new Date().toISOString()
        });

        // Listen for answer
        unsubscribe = wrapOnSnapshot(onSnapshot, callDocRef, async (snapshot) => {
          const data = snapshot.data();
          if (data?.answer && callStatus !== 'connected') {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            setCallStatus('connected');
          }
          if (data?.status === 'ended') {
            endCall();
          }
        });

        // Listen for answer candidates
        unsubscribeAnswerCandidates = wrapOnSnapshot(onSnapshot, collection(db, 'groups', groupId, 'calls', currentCallId, 'answerCandidates'), (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              let data = change.doc.data();
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(data));
            }
          });
        });
      }
    };

    initCall().catch(err => {
      console.error('Failed to init call:', err);
      onEndCall();
    });

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeOfferCandidates) unsubscribeOfferCandidates();
      if (unsubscribeAnswerCandidates) unsubscribeAnswerCandidates();
    };
  }, [callId, groupId]);

  const endCall = async () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    onEndCall();
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (callId && groupId) {
      try {
        await wrapUpdateDoc(updateDoc, doc(db, 'groups', groupId, 'calls', callId), { status: 'ended' });
      } catch (e) {}
    }
    onEndCall();
  };

  const toggleMute = () => {
    localStream.getAudioTracks()[0].enabled = isMuted;
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    localStream.getVideoTracks()[0].enabled = isVideoOff;
    setIsVideoOff(!isVideoOff);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background-dark/98 backdrop-blur-2xl animate-in fade-in duration-500">

      {/* Video Grid */}
      <div className="relative w-full h-full flex flex-col items-center justify-center p-4">

        {/* Remote Video (Main) */}
        <div className="relative w-full max-w-5xl aspect-video rounded-3xl bg-card-dark overflow-hidden shadow-2xl border border-primary/10">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background-dark/60">
                <div className="size-32 rounded-full bg-gradient-to-br from-primary to-purple-900 p-1 animate-pulse mb-6">
                    <div className="size-full rounded-full bg-card-dark flex items-center justify-center text-primary text-5xl font-bold">
                        {otherUser.username?.charAt(0) || 'U'}
                    </div>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-white">{otherUser.username}</h2>
                <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs mt-2 animate-pulse">
                    {callStatus === 'calling' && 'Initiating Secure Link...'}
                    {callStatus === 'incoming' && 'Incoming Secure Link...'}
                </p>
            </div>
          )}
        </div>

        {/* Local Video (PIP) */}
        <div className="absolute bottom-24 right-8 w-48 aspect-video rounded-2xl bg-card-dark overflow-hidden shadow-2xl border-2 border-primary/30 z-10 hover:scale-105 transition-transform">
           <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} />
           {isVideoOff && (
             <div className="size-full flex items-center justify-center bg-slate-900 text-slate-500">
                <span className="material-symbols-outlined">videocam_off</span>
             </div>
           )}
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-background-dark/80 backdrop-blur-xl rounded-3xl border border-primary/10 shadow-glow">
           <button
             onClick={toggleMute}
             className={`size-12 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
           >
              <span className="material-symbols-outlined">{isMuted ? 'mic_off' : 'mic'}</span>
           </button>
           <button
             onClick={toggleVideo}
             className={`size-12 rounded-2xl flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
           >
              <span className="material-symbols-outlined">{isVideoOff ? 'videocam_off' : 'videocam'}</span>
           </button>
           <div className="w-px h-8 bg-white/10 mx-2" />
           <button
             onClick={endCall}
             className="size-12 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 hover:scale-110 hover:rotate-90 transition-all"
           >
              <span className="material-symbols-outlined rotate-[135deg]">call</span>
           </button>
        </div>

      </div>
    </div>
  );
};

export default VoiceCall;
