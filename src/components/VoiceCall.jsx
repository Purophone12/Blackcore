import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot, updateDoc, collection, addDoc } from 'firebase/firestore';

const VoiceCall = ({ otherUser, user, onEndCall, incomingOffer, callId: initialCallId, groupId }) => {
  const [callStatus, setCallStatus] = useState(incomingOffer ? 'incoming' : 'calling');
  const [localStream, setLocalStream] = useState(null);
  const peerConnection = useRef(null);
  const remoteAudioRef = useRef(null);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      peerConnection.current = new RTCPeerConnection(configuration);
      stream.getTracks().forEach(track => peerConnection.current.addTrack(track, stream));

      let currentCallId = initialCallId;

      peerConnection.current.onicecandidate = (event) => {
        if (event.candidate && currentCallId && groupId) {
          const collectionName = incomingOffer ? 'answerCandidates' : 'offerCandidates';
          addDoc(collection(db, 'groups', groupId, 'calls', currentCallId, collectionName), event.candidate.toJSON());
        }
      };

      peerConnection.current.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      if (incomingOffer) {
        setCallId(initialCallId);

        // Listen for offer candidates
        unsubscribeOfferCandidates = onSnapshot(collection(db, 'groups', groupId, 'calls', initialCallId, 'offerCandidates'), (snapshot) => {
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

        await updateDoc(doc(db, 'groups', groupId, 'calls', initialCallId), {
          answer: { type: answer.type, sdp: answer.sdp },
          status: 'connected'
        });
        setCallStatus('connected');

        unsubscribe = onSnapshot(doc(db, 'groups', groupId, 'calls', initialCallId), (snapshot) => {
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
        unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
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
        unsubscribeAnswerCandidates = onSnapshot(collection(db, 'groups', groupId, 'calls', currentCallId, 'answerCandidates'), (snapshot) => {
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
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (callId && groupId) {
      try {
        await updateDoc(doc(db, 'groups', groupId, 'calls', callId), { status: 'ended' });
      } catch (e) {}
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
                 {otherUser.username?.charAt(0) || 'U'}
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
