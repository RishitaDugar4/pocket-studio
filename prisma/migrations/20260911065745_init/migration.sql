-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'SHORT_FILM',
    "mood" TEXT NOT NULL DEFAULT 'NATURALISTIC',
    "genre" TEXT,
    "logline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "script" TEXT NOT NULL DEFAULT '',
    "thumbnail" TEXT,
    "challengeSlug" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "timeOfDay" TEXT NOT NULL DEFAULT 'DAY',
    "environmentId" TEXT NOT NULL DEFAULT 'apartment',
    "lightingPreset" TEXT NOT NULL DEFAULT 'WARM_INTERIOR',
    "versionLabel" TEXT NOT NULL DEFAULT 'Original',
    "notes" TEXT NOT NULL DEFAULT '',
    "projectId" TEXT NOT NULL,
    "parentSceneId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL DEFAULT '#c9a227',
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneCharacter" (
    "id" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "rotation" JSONB NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "animation" TEXT NOT NULL DEFAULT 'IDLE',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "sceneId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,

    CONSTRAINT "SceneCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SceneProp" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "rotation" JSONB NOT NULL,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sceneId" TEXT NOT NULL,

    CONSTRAINT "SceneProp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Light" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "intensity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "position" JSONB NOT NULL,
    "rotation" JSONB NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#ffffff',
    "temperature" INTEGER NOT NULL DEFAULT 5600,
    "size" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "sceneId" TEXT NOT NULL,

    CONSTRAINT "Light_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" JSONB NOT NULL,
    "target" JSONB NOT NULL,
    "focalLength" DOUBLE PRECISION NOT NULL DEFAULT 35,
    "aperture" DOUBLE PRECISION NOT NULL DEFAULT 2.8,
    "dofEnabled" BOOLEAN NOT NULL DEFAULT false,
    "focusTargetId" TEXT,
    "shotSize" TEXT NOT NULL DEFAULT 'MEDIUM',
    "heightPreset" TEXT NOT NULL DEFAULT 'EYE',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "sceneId" TEXT NOT NULL,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shotSize" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "cameraState" JSONB NOT NULL,
    "subjects" JSONB NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "transition" TEXT NOT NULL DEFAULT 'CUT',
    "sceneId" TEXT NOT NULL,
    "cameraId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CameraMovement" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "startTransform" JSONB NOT NULL,
    "endTransform" JSONB NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "shotId" TEXT NOT NULL,

    CONSTRAINT "CameraMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockingEvent" (
    "id" TEXT NOT NULL,
    "startTime" DOUBLE PRECISION NOT NULL,
    "endTime" DOUBLE PRECISION NOT NULL,
    "action" TEXT NOT NULL,
    "startPosition" JSONB NOT NULL,
    "endPosition" JSONB NOT NULL,
    "rotation" JSONB NOT NULL,
    "sceneId" TEXT NOT NULL,
    "sceneCharacterId" TEXT NOT NULL,

    CONSTRAINT "BlockingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryboardFrame" (
    "id" TEXT NOT NULL,
    "imageKey" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 640,
    "height" INTEGER NOT NULL DEFAULT 360,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shotId" TEXT NOT NULL,

    CONSTRAINT "StoryboardFrame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "track" TEXT NOT NULL DEFAULT 'VIDEO',
    "startTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "trimIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trimOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "transition" TEXT NOT NULL DEFAULT 'CUT',
    "projectId" TEXT NOT NULL,
    "shotId" TEXT,
    "audioAssetId" TEXT,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudioAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SFX',
    "storageKey" TEXT NOT NULL,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "AudioAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "constraints" JSONB NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Scene_projectId_idx" ON "Scene"("projectId");

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE INDEX "SceneCharacter_sceneId_idx" ON "SceneCharacter"("sceneId");

-- CreateIndex
CREATE INDEX "SceneProp_sceneId_idx" ON "SceneProp"("sceneId");

-- CreateIndex
CREATE INDEX "Light_sceneId_idx" ON "Light"("sceneId");

-- CreateIndex
CREATE INDEX "Camera_sceneId_idx" ON "Camera"("sceneId");

-- CreateIndex
CREATE INDEX "Shot_sceneId_idx" ON "Shot"("sceneId");

-- CreateIndex
CREATE INDEX "CameraMovement_shotId_idx" ON "CameraMovement"("shotId");

-- CreateIndex
CREATE INDEX "BlockingEvent_sceneId_idx" ON "BlockingEvent"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryboardFrame_shotId_key" ON "StoryboardFrame"("shotId");

-- CreateIndex
CREATE INDEX "TimelineItem_projectId_idx" ON "TimelineItem"("projectId");

-- CreateIndex
CREATE INDEX "AudioAsset_projectId_idx" ON "AudioAsset"("projectId");

-- CreateIndex
CREATE INDEX "ProjectVersion_projectId_idx" ON "ProjectVersion"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_parentSceneId_fkey" FOREIGN KEY ("parentSceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneCharacter" ADD CONSTRAINT "SceneCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SceneProp" ADD CONSTRAINT "SceneProp_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Light" ADD CONSTRAINT "Light_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Camera" ADD CONSTRAINT "Camera_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_cameraId_fkey" FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CameraMovement" ADD CONSTRAINT "CameraMovement_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockingEvent" ADD CONSTRAINT "BlockingEvent_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockingEvent" ADD CONSTRAINT "BlockingEvent_sceneCharacterId_fkey" FOREIGN KEY ("sceneCharacterId") REFERENCES "SceneCharacter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardFrame" ADD CONSTRAINT "StoryboardFrame_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "AudioAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudioAsset" ADD CONSTRAINT "AudioAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
