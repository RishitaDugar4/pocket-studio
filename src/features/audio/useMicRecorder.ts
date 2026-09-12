"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Recording from a system input device.
 *
 * The hook owns the stream's lifecycle: a single effect keyed on the chosen
 * device opens it and closes it again. Device *labels* are blank until the
 * browser has granted access at least once, so the list is read after the first
 * successful open — otherwise the picker is a row of empty strings.
 */
export interface MicDevice {
  deviceId: string;
  label: string;
}

export type MicStatus = "IDLE" | "OPENING" | "READY" | "RECORDING" | "DENIED" | "UNSUPPORTED";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

export function micMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function useMicRecorder() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<MicStatus>("IDLE");
  const [devices, setDevices] = useState<MicDevice[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let raf = 0;
    let media: MediaStream | null = null;
    let context: AudioContext | null = null;

    const open = async () => {
      // Effects only run in the browser, but the APIs may still be missing.
      if (!navigator.mediaDevices?.getUserMedia || !micMimeType()) {
        setStatus("UNSUPPORTED");
        return;
      }
      setStatus("OPENING");
      setError(null);
      try {
        media = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = media;

        // Permission has been granted, so the labels are readable now.
        const all = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const inputs = all
          .filter((device) => device.kind === "audioinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Input ${index + 1}`,
          }));
        setDevices(inputs);
        // Adopt whichever device actually opened, so the picker matches reality.
        const activeId = media.getAudioTracks()[0]?.getSettings().deviceId;
        if (!deviceId && (activeId || inputs[0]?.deviceId)) {
          setDeviceId(activeId ?? inputs[0].deviceId);
        }

        context = new AudioContext();
        const source = context.createMediaStreamSource(media);
        const analyser = context.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const meter = () => {
          analyser.getByteTimeDomainData(data);
          let peak = 0;
          for (const sample of data) peak = Math.max(peak, Math.abs(sample - 128) / 128);
          setLevel(peak);
          if (recorder.current?.state === "recording") {
            setElapsed((performance.now() - startedAt.current) / 1000);
          }
          raf = requestAnimationFrame(meter);
        };
        raf = requestAnimationFrame(meter);

        setStatus((current) => (current === "RECORDING" ? current : "READY"));
      } catch (caught) {
        if (cancelled) return;
        const message =
          caught instanceof Error ? caught.message : "Could not open the microphone.";
        setError(message);
        setStatus(/denied|not allowed|permission/i.test(message) ? "DENIED" : "IDLE");
      }
    };

    void open();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      media?.getTracks().forEach((track) => track.stop());
      if (stream.current === media) stream.current = null;
      void context?.close();
      setLevel(0);
    };
  }, [enabled, deviceId]);

  const start = useCallback(() => {
    const media = stream.current;
    const mimeType = micMimeType();
    if (!media) return;
    if (!mimeType) {
      setStatus("UNSUPPORTED");
      return;
    }

    chunks.current = [];
    const instance = new MediaRecorder(media, { mimeType });
    instance.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.current.push(event.data);
    };
    recorder.current = instance;
    startedAt.current = performance.now();
    setElapsed(0);
    instance.start();
    setStatus("RECORDING");
  }, []);

  const stop = useCallback(async (): Promise<{ blob: Blob; duration: number } | null> => {
    const instance = recorder.current;
    if (!instance || instance.state === "inactive") return null;

    const duration = (performance.now() - startedAt.current) / 1000;
    const blob = await new Promise<Blob>((resolve) => {
      instance.onstop = () => resolve(new Blob(chunks.current, { type: instance.mimeType }));
      instance.stop();
    });
    recorder.current = null;
    setStatus("READY");
    return { blob, duration };
  }, []);

  const cancel = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
    recorder.current = null;
    chunks.current = [];
    setStatus(stream.current ? "READY" : "IDLE");
    setElapsed(0);
  }, []);

  return {
    status,
    devices,
    deviceId,
    elapsed,
    level,
    error,
    /** Opens the microphone; the effect tears it down when this goes false. */
    setEnabled,
    setDevice: setDeviceId,
    start,
    stop,
    cancel,
  };
}
