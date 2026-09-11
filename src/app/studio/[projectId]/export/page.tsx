import { MilestonePlaceholder } from "@/components/project/MilestonePlaceholder";

export default async function ExportPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <MilestonePlaceholder
      milestone="Not built yet"
      title="Export previs"
      body="Recording the previs to WebM comes after the sequence editor, so there is a sequence to record."
      nextHref={`/studio/${projectId}/scenes`}
      nextLabel="Open Scene Builder →"
    />
  );
}
