-- CreateTable
CREATE TABLE "public"."admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."letters" (
    "id" TEXT NOT NULL,
    "letter_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."permission_letters" (
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
CREATE TABLE "public"."permission_participants" (
    "id" TEXT NOT NULL,
    "permission_letter_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "public"."admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "letters_letter_number_key" ON "public"."letters"("letter_number");

-- CreateIndex
CREATE UNIQUE INDEX "permission_letters_letter_number_key" ON "public"."permission_letters"("letter_number");

-- AddForeignKey
ALTER TABLE "public"."letters" ADD CONSTRAINT "letters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."letters" ADD CONSTRAINT "letters_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permission_letters" ADD CONSTRAINT "permission_letters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permission_letters" ADD CONSTRAINT "permission_letters_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."permission_participants" ADD CONSTRAINT "permission_participants_permission_letter_id_fkey" FOREIGN KEY ("permission_letter_id") REFERENCES "public"."permission_letters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
