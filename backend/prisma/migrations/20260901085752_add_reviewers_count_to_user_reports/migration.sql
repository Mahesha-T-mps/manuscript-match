-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_user_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "process_title" TEXT NOT NULL,
    "recommendations_count" INTEGER NOT NULL DEFAULT 0,
    "shortlisted_count" INTEGER NOT NULL DEFAULT 0,
    "reviewers_count" INTEGER NOT NULL DEFAULT 0,
    "report_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_user_reports" ("created_at", "id", "process_id", "process_title", "recommendations_count", "report_date", "shortlisted_count", "user_id") SELECT "created_at", "id", "process_id", "process_title", "recommendations_count", "report_date", "shortlisted_count", "user_id" FROM "user_reports";
DROP TABLE "user_reports";
ALTER TABLE "new_user_reports" RENAME TO "user_reports";
CREATE INDEX "user_reports_user_id_idx" ON "user_reports"("user_id");
CREATE INDEX "user_reports_process_id_idx" ON "user_reports"("process_id");
CREATE INDEX "user_reports_report_date_idx" ON "user_reports"("report_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
