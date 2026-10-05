/*
  Warnings:

  - You are about to drop the column `subject_area` on the `user_reports` table. All the data in the column will be lost.

*/
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
    "shortlisted_authors" TEXT,
    "recommended_authors" TEXT,
    "keywords" TEXT,
    "report_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_user_reports" ("created_at", "id", "keywords", "process_id", "process_title", "recommendations_count", "recommended_authors", "report_date", "reviewers_count", "shortlisted_authors", "shortlisted_count", "user_id") SELECT "created_at", "id", "keywords", "process_id", "process_title", "recommendations_count", "recommended_authors", "report_date", "reviewers_count", "shortlisted_authors", "shortlisted_count", "user_id" FROM "user_reports";
DROP TABLE "user_reports";
ALTER TABLE "new_user_reports" RENAME TO "user_reports";
CREATE INDEX "user_reports_user_id_idx" ON "user_reports"("user_id");
CREATE INDEX "user_reports_process_id_idx" ON "user_reports"("process_id");
CREATE INDEX "user_reports_report_date_idx" ON "user_reports"("report_date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
