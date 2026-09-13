import { Suspense } from "react";
import { EditSuite } from "@/components/edit/EditSuite";

export default function EditPage() {
  return (
    <Suspense
      fallback={<div className="flex flex-1 items-center justify-center slate">Loading cut…</div>}
    >
      <EditSuite />
    </Suspense>
  );
}
