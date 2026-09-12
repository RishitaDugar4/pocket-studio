"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Inputs";
import { cn } from "@/components/ui/cn";
import { SOUND_LIBRARY, renderSound, type SoundDefinition } from "@/features/audio/library";
import { addSound, readDuration } from "@/features/audio/upload";
import { useMicRecorder } from "@/features/audio/useMicRecorder";
import type { AudioTrack } from "@/types";

type Source = "LIBRARY" | "MIC" | "FILE";

/**
 * Three ways to get sound onto a track (§24): the built-in library, the
 * microphone, or a file from the computer. They all end up as the same kind of
 * clip, laid in at the playhead.
 */
export function AddSoundMenu({
  projectId,
  track,
  onDone,
  onError,
}: {
  projectId: string;
  track: AudioTrack;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const [source, setSource] = useState<Source>("LIBRARY");
  const [busy, setBusy] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  // Clicking anywhere else puts the menu away.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) onDone();
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [onDone]);

  return (
    <div
      ref={container}
      className="animate-fade absolute bottom-full right-0 z-30 mb-1 w-[300px] panel p-2 shadow-xl shadow-black/50"
    >
      <div className="mb-2 flex rounded border border-ink-700 bg-ink-900 p-0.5">
        {(
          [
            ["LIBRARY", "Library"],
            ["MIC", "Microphone"],
            ["FILE", "File"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSource(value)}
            className={cn(
              "slate flex-1 rounded-sm py-1 transition-colors",
              source === value ? "bg-ink-600 text-fog-100" : "text-fog-400 hover:text-fog-200",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {source === "LIBRARY" ? (
        <LibraryPicker
          projectId={projectId}
          track={track}
          busy={busy}
          setBusy={setBusy}
          onDone={onDone}
          onError={onError}
        />
      ) : null}
      {source === "MIC" ? (
        <MicPanel projectId={projectId} track={track} onDone={onDone} onError={onError} />
      ) : null}
      {source === "FILE" ? (
        <FilePicker projectId={projectId} track={track} onDone={onDone} onError={onError} />
      ) : null}
    </div>
  );
}

function LibraryPicker({
  projectId,
  track,
  busy,
  setBusy,
  onDone,
  onError,
}: {
  projectId: string;
  track: AudioTrack;
  busy: string | null;
  setBusy: (id: string | null) => void;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const preview = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      preview.current?.pause();
      preview.current = null;
    },
    [],
  );

  const listen = async (definition: SoundDefinition) => {
    onError(null);
    setBusy(`preview-${definition.id}`);
    try {
      const blob = await renderSound(definition);
      preview.current?.pause();
      const audio = new Audio(URL.createObjectURL(blob));
      preview.current = audio;
      await audio.play();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not play that sound.");
    } finally {
      setBusy(null);
    }
  };

  const place = async (definition: SoundDefinition) => {
    onError(null);
    setBusy(definition.id);
    try {
      const blob = await renderSound(definition);
      const file = new File([blob], `${definition.name}.wav`, { type: "audio/wav" });
      await addSound({ projectId, file, track, duration: definition.duration });
      onDone();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not add that sound.");
    } finally {
      setBusy(null);
    }
  };

  // Sounds made for this track first — the rest still work anywhere.
  const sounds = [...SOUND_LIBRARY].sort(
    (a, b) => Number(b.track === track) - Number(a.track === track),
  );

  return (
    <div>
      <div className="max-h-[260px] space-y-0.5 overflow-y-auto">
        {sounds.map((definition) => (
          <div
            key={definition.id}
            className="group flex items-center gap-2 rounded px-1.5 py-1 hover:bg-ink-800"
          >
            <button
              type="button"
              onClick={() => void listen(definition)}
              title="Listen"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-ink-600 text-fog-400 transition-colors hover:border-amber-dim hover:text-amber-film"
            >
              <svg viewBox="0 0 12 12" className="h-2 w-2 fill-current">
                <path d="M2.5 1.5 L10 6 L2.5 10.5 Z" />
              </svg>
            </button>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] text-fog-100">{definition.name}</span>
              <span className="slate block truncate text-fog-500">{definition.description}</span>
            </span>
            <span className="numeric shrink-0 text-[10px] text-fog-500">
              {definition.duration.toFixed(0)}s
            </span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void place(definition)}
              className="slate shrink-0 text-fog-400 transition-colors hover:text-amber-film disabled:opacity-40"
            >
              {busy === definition.id ? "…" : "Add"}
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-ink-800 pt-2 text-[10px] leading-relaxed text-fog-400">
        Generated in your browser, not sampled from anywhere — free to use in anything you make.
      </p>
    </div>
  );
}

function MicPanel({
  projectId,
  track,
  onDone,
  onError,
}: {
  projectId: string;
  track: AudioTrack;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const mic = useMicRecorder();
  const [saving, setSaving] = useState(false);
  const { setEnabled } = mic;

  // Opening the panel is the moment to ask for the microphone, and closing it
  // is the moment to let the device go again.
  useEffect(() => {
    setEnabled(true);
    return () => setEnabled(false);
  }, [setEnabled]);

  useEffect(() => {
    if (mic.error) onError(mic.error);
  }, [mic.error, onError]);

  const finish = async () => {
    const take = await mic.stop();
    if (!take) return;
    setSaving(true);
    try {
      const extension = take.blob.type.includes("ogg") ? "ogg" : take.blob.type.includes("mp4") ? "m4a" : "weba";
      const file = new File([take.blob], `Take ${new Date().toLocaleTimeString()}.${extension}`, {
        type: take.blob.type,
      });
      const measured = await readDuration(take.blob);
      await addSound({
        projectId,
        file,
        track,
        // WebM from MediaRecorder often reports no duration; the clock knows.
        duration: measured > 0.05 && Number.isFinite(measured) ? measured : take.duration,
      });
      onDone();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Could not save that take.");
    } finally {
      setSaving(false);
    }
  };

  if (mic.status === "UNSUPPORTED") {
    return (
      <p className="px-1 py-2 text-[11px] leading-relaxed text-alert">
        This browser cannot record audio.
      </p>
    );
  }

  if (mic.status === "DENIED") {
    return (
      <p className="px-1 py-2 text-[11px] leading-relaxed text-alert">
        Microphone access was blocked. Allow it for this site in your browser settings, then reopen
        this menu.
      </p>
    );
  }

  return (
    <div className="space-y-2 px-1 pb-1">
      <Select
        value={mic.deviceId}
        onChange={mic.setDevice}
        options={
          mic.devices.length
            ? mic.devices.map((device) => ({ value: device.deviceId, label: device.label }))
            : [{ value: "", label: "Waiting for the microphone…" }]
        }
      />

      <div className="flex items-center gap-2">
        <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-700">
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-75",
              mic.level > 0.85 ? "bg-alert" : "bg-amber-film",
            )}
            style={{ width: `${Math.min(mic.level * 140, 100)}%` }}
          />
        </span>
        <span className="numeric w-10 shrink-0 text-right text-[10px] text-fog-400">
          {mic.elapsed.toFixed(1)}s
        </span>
      </div>

      <div className="flex gap-2">
        {mic.status === "RECORDING" ? (
          <>
            <Button size="sm" variant="primary" className="flex-1" disabled={saving} onClick={finish}>
              {saving ? "Saving…" : "Stop & add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={mic.cancel}>
              Discard
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="flex-1"
            disabled={mic.status !== "READY"}
            onClick={mic.start}
          >
            {mic.status === "READY" ? "Record" : "Opening microphone…"}
          </Button>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-fog-400">
        The take lands on the {track.toLowerCase()} track at the playhead. Scratch dialogue is what
        this is for — record the line, cut to it, hear whether the shot is long enough.
      </p>
    </div>
  );
}

function FilePicker({
  projectId,
  track,
  onDone,
  onError,
}: {
  projectId: string;
  track: AudioTrack;
  onDone: () => void;
  onError: (message: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    onError(null);
    try {
      await addSound({ projectId, file, track });
      onDone();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 px-1 pb-1">
      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? "Uploading…" : "Choose an audio file"}
      </Button>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
      <p className="text-[10px] leading-relaxed text-fog-400">
        MP3, WAV, OGG, M4A or WebM, up to 25 MB. It lands at the playhead.
      </p>
    </div>
  );
}
