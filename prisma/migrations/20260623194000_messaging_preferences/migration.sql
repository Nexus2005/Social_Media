-- CreateTable
CREATE TABLE "chat_pins" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_pins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_archives" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_archives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_mutes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "chat_mutes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "wallpaper" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_pins_user_id_channel_id_key" ON "chat_pins"("user_id", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_archives_user_id_channel_id_key" ON "chat_archives"("user_id", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_mutes_user_id_channel_id_key" ON "chat_mutes"("user_id", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_settings_user_id_channel_id_key" ON "conversation_settings"("user_id", "channel_id");

-- AddForeignKey
ALTER TABLE "chat_pins" ADD CONSTRAINT "chat_pins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_archives" ADD CONSTRAINT "chat_archives_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_mutes" ADD CONSTRAINT "chat_mutes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_settings" ADD CONSTRAINT "conversation_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
