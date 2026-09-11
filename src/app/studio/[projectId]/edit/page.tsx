import { MilestonePlaceholder } from "@/components/project/MilestonePlaceholder";

export default async function EditPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <MilestonePlaceholder
      milestone="Not built yet"
      title="Sequence editor"
      body="Cutting shots together needs shots first. The camera-move preview in the Scene Builder uses the same playback clock this timeline will run on."
      nextHref={`/studio/${projectId}/scenes`}
      nextLabel="Open Scene Builder →"
    />
  );
}
