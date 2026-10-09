import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera(onActiveChange: (active: boolean) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mounted = useRef(true);
  const opening = useRef(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setStream(null);
    onActiveChange(false);
  }, [onActiveChange]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      streamRef.current?.getTracks().forEach(track => track.stop());
      onActiveChange(false);
    };
  }, [onActiveChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.srcObject = stream;
  }, [stream]);

  const start = useCallback(async () => {
    if (opening.current || streamRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access requires HTTPS and browser camera support. Upload a photo instead.');
      return;
    }
    opening.current = true;
    setIsOpening(true);
    setError('');
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mounted.current) {
        next.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = next;
      setStream(next);
      onActiveChange(true);
      next.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (mounted.current && streamRef.current === next) {
          stop();
          setError('The camera disconnected. Reopen the camera or upload a photo.');
        }
      }, { once: true });
    } catch (cause) {
      if (!mounted.current) return;
      const name = cause instanceof DOMException ? cause.name : '';
      setError(name === 'NotAllowedError'
        ? 'Camera permission was denied. Allow camera access in browser settings, or upload a photo. The preview iframe may restrict camera access; open the deployed app directly if needed.'
        : name === 'NotFoundError' ? 'No camera was found. Connect a camera or upload a photo.'
        : 'The camera is unavailable or in use. Close other camera apps and retry, or upload a photo.');
    } finally {
      opening.current = false;
      if (mounted.current) setIsOpening(false);
    }
  }, [stop, onActiveChange]);

  const capture = useCallback(async (): Promise<File | null> => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      setError('Wait for the camera preview to appear before capturing.');
      return null;
    }
    const scale = Math.min(1, 1568 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) { setError('Snapshot capture is unavailable. Upload a photo instead.'); return null; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob) { setError('Could not capture the frame. Retry or upload a photo.'); return null; }
    setError('');
    return new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
  }, []);

  return { videoRef, stream, isOpening, error, start, stop, capture };
}
