-- CreateTable
CREATE TABLE "StoredAsset" (
    "key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredAsset_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "StoredAsset_createdAt_idx" ON "StoredAsset"("createdAt");

