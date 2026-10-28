-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "locality" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'casa_noua',
    "builtArea" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "usefulArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "floors" INTEGER NOT NULL DEFAULT 1,
    "roomHeight" DOUBLE PRECISION NOT NULL DEFAULT 2.7,
    "roofType" TEXT NOT NULL DEFAULT 'doua_ape',
    "roofSlope" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "roofCovering" TEXT NOT NULL DEFAULT 'tigla_metal',
    "foundationType" TEXT NOT NULL DEFAULT 'banda',
    "extWallSystem" TEXT NOT NULL DEFAULT 'beton_celular',
    "intWallSystem" TEXT NOT NULL DEFAULT 'beton_celular_10',
    "ceilingSystem" TEXT NOT NULL DEFAULT 'monolit',
    "finishLevel" TEXT NOT NULL DEFAULT 'standard',
    "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MDL',
    "exteriorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "exteriorArea" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exteriorFence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exteriorGate" INTEGER NOT NULL DEFAULT 0,
    "options" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'camera',
    "floorIndex" INTEGER NOT NULL DEFAULT 0,
    "length" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 3.5,
    "height" DOUBLE PRECISION,
    "doorCount" INTEGER NOT NULL DEFAULT 1,
    "doorWidth" DOUBLE PRECISION NOT NULL DEFAULT 0.9,
    "doorHeight" DOUBLE PRECISION NOT NULL DEFAULT 2.05,
    "windowCount" INTEGER NOT NULL DEFAULT 0,
    "windowWidth" DOUBLE PRECISION NOT NULL DEFAULT 1.4,
    "windowHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "floorType" TEXT NOT NULL DEFAULT 'laminat',
    "wallFinish" TEXT NOT NULL DEFAULT 'tencuiala_vopsea',
    "ceilingType" TEXT NOT NULL DEFAULT 'vopsea',
    "config" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "manufacturer" TEXT NOT NULL DEFAULT '',
    "spec" TEXT NOT NULL DEFAULT '',
    "unit" TEXT NOT NULL,
    "packageQty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "packageLabel" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priceCurrency" TEXT NOT NULL DEFAULT 'MDL',
    "supplier" TEXT NOT NULL DEFAULT '',
    "locality" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'indicativ',
    "priceDate" TEXT NOT NULL DEFAULT '',
    "link" TEXT NOT NULL DEFAULT '',
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaborRate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'indicativ',
    "priceDate" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LaborRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backup" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'auto',
    "hash" TEXT NOT NULL DEFAULT '',
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Backup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "passHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Room_projectId_idx" ON "Room"("projectId");

-- CreateIndex
CREATE INDEX "Material_code_idx" ON "Material"("code");

-- CreateIndex
CREATE INDEX "Material_category_idx" ON "Material"("category");

-- CreateIndex
CREATE UNIQUE INDEX "LaborRate_code_key" ON "LaborRate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE INDEX "Backup_createdAt_idx" ON "Backup"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

