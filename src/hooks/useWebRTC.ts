import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = (
  appointmentId: string | null | undefined,
  role: 'patient' | 'doctor'
) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'camera_denied' | 'error'>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    if (!appointmentId) return;
    let cancelled = false;

    const init = async () => {
      try {
        // 1. Get local media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // 2. Create peer connection
        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // 3. Remote stream handler
        pc.ontrack = (event) => {
          console.log('[WebRTC] Remote track received');
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
          setCallStatus('connected');
        };

        pc.onconnectionstatechange = () => {
          const state = pc.connectionState;
          console.log('[WebRTC] Connection state:', state);
          if (state === 'connected') setCallStatus('connected');
          if (state === 'disconnected' || state === 'failed') setCallStatus('disconnected');
        };

        // 4. Supabase broadcast channel for signaling
        const channel = supabase.channel(`webrtc-${appointmentId}`, {
          config: { broadcast: { self: false } },
        });
        channelRef.current = channel;

        // ICE candidate handler - send via broadcast
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate.toJSON(), from: role },
            });
          }
        };

        // Listen for signaling messages
        channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
          if (role !== 'doctor') return;
          console.log('[WebRTC] Doctor received offer');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
            // Flush queued ICE candidates
            for (const c of iceCandidateQueue.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            iceCandidateQueue.current = [];

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            channel.send({ type: 'broadcast', event: 'answer', payload: { answer } });
          } catch (e) { console.error('[WebRTC] Offer handling error:', e); }
        });

        channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
          if (role !== 'patient') return;
          console.log('[WebRTC] Patient received answer');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
            for (const c of iceCandidateQueue.current) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
            iceCandidateQueue.current = [];
          } catch (e) { console.error('[WebRTC] Answer handling error:', e); }
        });

        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.from === role) return; // ignore own candidates
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              iceCandidateQueue.current.push(payload.candidate);
            }
          } catch (e) { console.error('[WebRTC] ICE candidate error:', e); }
        });

        // Patient sends re-offer periodically until connected, in case doctor joins late
        channel.on('broadcast', { event: 'ready' }, async ({ payload }) => {
          if (role === 'patient' && payload.from === 'doctor') {
            console.log('[WebRTC] Doctor signaled ready, sending offer');
            await sendOffer(pc, channel);
          }
        });

        await channel.subscribe(async (status) => {
          console.log('[WebRTC] Channel status:', status);
          if (status === 'SUBSCRIBED') {
            if (role === 'patient') {
              // Wait briefly for doctor to subscribe, then send offer
              setTimeout(() => sendOffer(pc, channel), 2000);
            } else {
              // Doctor signals readiness so patient can re-send offer
              channel.send({ type: 'broadcast', event: 'ready', payload: { from: 'doctor' } });
            }
          }
        });
      } catch (error: any) {
        if (cancelled) return;
        console.error('[WebRTC] Init error:', error);
        if (error.name === 'NotAllowedError' || error.name === 'NotFoundError') {
          setCallStatus('camera_denied');
        } else {
          setCallStatus('error');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [appointmentId, role]);

  const sendOffer = async (pc: RTCPeerConnection, channel: ReturnType<typeof supabase.channel>) => {
    try {
      if (pc.signalingState === 'have-local-offer') {
        // Already have an offer, re-send it
        channel.send({ type: 'broadcast', event: 'offer', payload: { offer: pc.localDescription } });
        return;
      }
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] Sending offer');
      channel.send({ type: 'broadcast', event: 'offer', payload: { offer } });
    } catch (e) { console.error('[WebRTC] Send offer error:', e); }
  };

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsMuted(m => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setIsCameraOff(c => !c);
  }, []);

  const endCall = useCallback(async () => {
    cleanup();
    if (appointmentId) {
      await supabase.from('appointments').update({
        status: 'completed',
        ended_at: new Date().toISOString(),
      }).eq('id', appointmentId);
    }
  }, [appointmentId]);

  return {
    localVideoRef,
    remoteVideoRef,
    callStatus,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    endCall,
  };
};
