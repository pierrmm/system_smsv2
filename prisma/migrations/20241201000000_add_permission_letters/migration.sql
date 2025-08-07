-- CreateTable
CREATE TABLE "permission_letters" (
    "id" TEXT NOT NULL,
    "letter_number" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time_start" TEXT NOT NULL,
    "time_end" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "letter_type" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_participants" (
    "id" TEXT NOT NULL,
    "permission_letter_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permission_letters_letter_number_key" ON "permission_letters"("letter_number");

-- AddForeignKey
ALTER TABLE "permission_participants" ADD CONSTRAINT "permission_participants_permission_letter_id_fkey" FOREIGN KEY ("permission_letter_id") REFERENCES "permission_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
