import { MilestonePlaceholder } from "@/components/project/MilestonePlaceholder";

export default async function ScriptPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <MilestonePlaceholder
      milestone="Not built yet"
      title="Script editor"
      body="The screenplay editor and its scene breakdown are not implemented yet. Scenes can be created and named directly in the Scene Builder in the meantime."
      nextHref={`/studio/${projectId}/scenes`}
      nextLabel="Open Scene Builder →"
    />
  );
}
