import { Suspense } from "react";
import { Storyboard } from "@/components/storyboard/Storyboard";

export default function StoryboardPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center slate">Loading…</div>}>
      <Storyboard />
    </Suspense>
  );
}
