-- CreateTable
CREATE TABLE "user_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "process_id" TEXT NOT NULL,
    "process_title" TEXT NOT NULL,
    "recommendations_count" INTEGER NOT NULL DEFAULT 0,
    "shortlisted_count" INTEGER NOT NULL DEFAULT 0,
    "report_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "user_reports_user_id_idx" ON "user_reports"("user_id");

-- CreateIndex
CREATE INDEX "user_reports_process_id_idx" ON "user_reports"("process_id");

-- CreateIndex
CREATE INDEX "user_reports_report_date_idx" ON "user_reports"("report_date");
