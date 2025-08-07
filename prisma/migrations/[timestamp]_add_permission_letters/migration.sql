CREATE TABLE "permission_letters" (
    "id" TEXT NOT NULL,
    "letter_number" TEXT,
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

CREATE TABLE "permission_participants" (
    "id" TEXT NOT NULL,
    "permission_letter_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "attendance" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_participants_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "permission_participants" ADD CONSTRAINT "permission_participants_permission_letter_id_fkey" FOREIGN KEY ("permission_letter_id") REFERENCES "permission_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;