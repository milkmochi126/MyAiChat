-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_friends" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "user_friends_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_user_friends" ("character_id", "created_at", "id", "user_id") SELECT "character_id", "created_at", "id", "user_id" FROM "user_friends";
DROP TABLE "user_friends";
ALTER TABLE "new_user_friends" RENAME TO "user_friends";
CREATE UNIQUE INDEX "user_friends_user_id_character_id_key" ON "user_friends"("user_id", "character_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
