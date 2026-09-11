import { MilestonePlaceholder } from "@/components/project/MilestonePlaceholder";

export default async function StoryboardPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <MilestonePlaceholder
      milestone="Not built yet"
      title="Storyboard"
      body="Shot capture and the storyboard come after blocking. Today you can frame shots live in the Scene Builder — lens, height, shot size, movement and focus are all working."
      nextHref={`/studio/${projectId}/scenes`}
      nextLabel="Open Scene Builder →"
    />
  );
}
