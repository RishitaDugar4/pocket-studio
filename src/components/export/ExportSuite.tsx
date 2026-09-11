"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Checkbox, SegmentedControl } from "@/components/ui/Inputs";
import { EmptyState, Section } from "@/components/ui/Panel";
import { SequencePlayer } from "@/components/edit/SequencePlayer";
import { AudioEngine } from "@/components/edit/AudioEngine";
import { usePlaybackClock } from "@/features/playback/usePlaybackClock";
import {
  recordSequence,
  supportedMimeType,
  type ExportOptions,
} from "@/features/export/recordSequence";
import { formatTimecode, resolveSequence, sequenceDuration } from "@/lib/edit/sequence";
import { useProjectStore } from "@/stores/projectStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { aspectValue, useViewportStore } from "@/stores/viewportStore";

const RESOLUTIONS = {
  "720": { label: "720p", height: 720 },
  "1080": { label: "1080p", height: 1080 },
} as const;

type ResolutionId = keyof typeof RESOLUTIONS;

/**
 * Export previs (§31). This is not a render — it is a recording of the previs
 * playing, which is exactly what the director wants to hand someone: "this is
 * roughly what my film looks like."
 */
export function ExportSuite() {
  const project = useProjectStore((s) => s.project);
  const activeScene = useSceneStore((s) => s.scene);
  const aspect = aspectValue(useViewportStore((s) => s.aspectId));
  const router = useRouter();
  usePlaybackClock();

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [resolution, setResolution] = useState<ResolutionId>("720");
  const [include, setInclude] = useState({
    audio: true,
    shotLabels: true,
    timecode: false,
    storyboardOverlay: false,
  });
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; size: number; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const merged = useMemo(() => {
    if (!project) return null;
    if (!activeScene) return project;
    return {
      ...project,
      scenes: project.scenes.map((scene) => (scene.id === activeScene.id ? activeScene : scene)),
    };
  }, [project, activeScene]);

  const clips = useMemo(() => (merged ? resolveSequence(merged) : []), [merged]);
  const duration = sequenceDuration(clips);
  const canRecord = typeof window !== "undefined" && supportedMimeType() !== null;

  useEffect(() => {
    useTimelineStore.getState().setLoop(false);
    useTimelineStore.getState().setDuration(Math.max(duration, 0.5));
    return () => useTimelineStore.getState().stop();
  }, [duration]);

  if (!project || !merged) {
    return <div className="flex flex-1 items-center justify-center slate">Loading film…</div>;
  }

  if (clips.length === 0) {
    return (
      <EmptyState
        title="Nothing to export yet"
        body="Export records the cut as it plays. Assemble some shots in the Edit room first."
        action={
          <Button variant="primary" onClick={() => router.push(`/studio/${project.id}/edit`)}>
            Open the cutting room →
          </Button>
        }
      />
    );
  }

  const start = async () => {
    const stage = stageRef.current;
    if (!stage || recording) return;
    setRecording(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const height = RESOLUTIONS[resolution].height;
    const options: ExportOptions = {
      width: Math.round((height * aspect) / 2) * 2,
      height,
      fps: 30,
      includeAudio: include.audio,
      shotLabels: include.shotLabels,
      timecode: include.timecode,
      storyboardOverlay: include.storyboardOverlay,
    };

    try {
      const { blob } = await recordSequence({
        stage,
        clips,
        duration,
        options,
        onProgress: setProgress,
      });
      const name = `${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-previs.webm`;
      setResult({ url: URL.createObjectURL(blob), size: blob.size, name });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The recording failed.");
    } finally {
      setRecording(false);
      useTimelineStore.getState().stop();
    }
  };

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-h-0 flex-col bg-ink-950">
        <div className="min-h-0 flex-1 p-5">
          <SequencePlayer clips={clips} aspect={aspect} stageRef={stageRef} />
        </div>
        <AudioEngine project={merged} />

        <div className="flex h-11 shrink-0 items-center gap-3 border-t border-ink-800 bg-ink-900 px-3">
          <span className="numeric text-[11px] text-fog-200">
            {formatTimecode(recording ? progress : 0)}
            <span className="text-fog-400"> / {formatTimecode(duration)}</span>
          </span>
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-ink-700">
            <div
              className="h-full rounded-full bg-amber-film transition-[width] duration-100"
              style={{ width: `${Math.min((progress / Math.max(duration, 0.001)) * 100, 100)}%` }}
            />
          </div>
          <span className="slate shrink-0">
            {recording ? "Recording — let it play" : `${clips.length} shots`}
          </span>
        </div>
      </div>

      <aside className="flex min-h-0 flex-col border-l border-ink-800 bg-ink-900">
        <div className="flex h-10 shrink-0 items-center border-b border-ink-700 px-3">
          <span className="slate">Export previs</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="Resolution">
            <SegmentedControl<ResolutionId>
              value={resolution}
              onChange={setResolution}
              options={(Object.keys(RESOLUTIONS) as ResolutionId[]).map((id) => ({
                value: id,
                label: RESOLUTIONS[id].label,
              }))}
            />
            <p className="numeric text-[10px] text-fog-400">
              {Math.round(RESOLUTIONS[resolution].height * aspect)} ×{" "}
              {RESOLUTIONS[resolution].height} · 30fps · WebM
            </p>
          </Section>

          <Section title="Include">
            <Checkbox
              label="Audio"
              checked={include.audio}
              onChange={(audio) => setInclude((current) => ({ ...current, audio }))}
            />
            <Checkbox
              label="Shot labels"
              checked={include.shotLabels}
              onChange={(shotLabels) => setInclude((current) => ({ ...current, shotLabels }))}
            />
            <Checkbox
              label="Timecode"
              checked={include.timecode}
              onChange={(timecode) => setInclude((current) => ({ ...current, timecode }))}
            />
            <Checkbox
              label="Storyboard overlay"
              checked={include.storyboardOverlay}
              onChange={(storyboardOverlay) =>
                setInclude((current) => ({ ...current, storyboardOverlay }))
              }
            />
            <p className="text-[10px] leading-relaxed text-fog-400">
              Composition guides are never exported — they are overlays on your monitor, not on the
              film.
            </p>
          </Section>

          <Section title="Record">
            {canRecord ? (
              <>
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={recording}
                  onClick={start}
                >
                  {recording ? `Recording ${progress.toFixed(1)}s…` : "Export previs"}
                </Button>
                <p className="text-[10px] leading-relaxed text-fog-400">
                  The cut is recorded as it plays, in real time — about{" "}
                  {Math.ceil(duration)} seconds. Leave this tab in front while it runs.
                </p>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-alert">
                This browser cannot record video. Chrome, Edge or Firefox can.
              </p>
            )}
            {error ? <p className="text-[11px] text-alert">{error}</p> : null}
          </Section>

          {result ? (
            <Section title="Ready">
              <video
                src={result.url}
                controls
                className="w-full rounded border border-ink-700 bg-black"
              />
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => downloadUrl(result.url, result.name)}
              >
                Download {(result.size / 1_000_000).toFixed(1)} MB
              </Button>
            </Section>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

/** The blob is already a URL by the time the director asks for it. */
function downloadUrl(url: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
