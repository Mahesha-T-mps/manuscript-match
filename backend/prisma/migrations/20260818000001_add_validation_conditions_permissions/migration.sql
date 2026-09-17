-- CreateTable: User Type Validation Conditions
-- This table stores which validation conditions are allowed for each user type
CREATE TABLE IF NOT EXISTS "user_type_validation_conditions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_type" TEXT NOT NULL,
    "condition_id" TEXT NOT NULL,
    "condition_label" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX "user_type_validation_conditions_user_type_condition_id_key" ON "user_type_validation_conditions"("user_type", "condition_id");

-- Create index for faster lookups
CREATE INDEX "user_type_validation_conditions_user_type_idx" ON "user_type_validation_conditions"("user_type");

-- Insert default validation conditions for all user types
INSERT INTO "user_type_validation_conditions" ("id", "user_type", "condition_id", "condition_label", "is_enabled", "updated_at") VALUES
-- SPRINGER user type
('vc-springer-1', 'SPRINGER', 'Publications', 'Publications', 1, CURRENT_TIMESTAMP),
('vc-springer-2', 'SPRINGER', 'First/Last Author in publications', 'First/Last Author Publications', 1, CURRENT_TIMESTAMP),
('vc-springer-3', 'SPRINGER', 'Relevant Publications', 'Relevant Publications', 1, CURRENT_TIMESTAMP),
('vc-springer-4', 'SPRINGER', 'Publication Types', 'Publication Types', 1, CURRENT_TIMESTAMP),
('vc-springer-5', 'SPRINGER', 'T&F Publications last year', 'Taylor & Francis Publications', 1, CURRENT_TIMESTAMP),
('vc-springer-6', 'SPRINGER', 'Conflict of Interest', 'Conflict of Interest', 1, CURRENT_TIMESTAMP),
('vc-springer-7', 'SPRINGER', 'Retraction History', 'Retraction History', 1, CURRENT_TIMESTAMP),
('vc-springer-8', 'SPRINGER', 'Study Type Detection', 'Study Type Detection', 1, CURRENT_TIMESTAMP),
('vc-springer-9', 'SPRINGER', 'Sanction Country', 'Sanction Country Check', 1, CURRENT_TIMESTAMP),

-- WILEY user type
('vc-wiley-1', 'WILEY', 'Publications', 'Publications', 1, CURRENT_TIMESTAMP),
('vc-wiley-2', 'WILEY', 'First/Last Author in publications', 'First/Last Author Publications', 1, CURRENT_TIMESTAMP),
('vc-wiley-3', 'WILEY', 'Relevant Publications', 'Relevant Publications', 1, CURRENT_TIMESTAMP),
('vc-wiley-4', 'WILEY', 'Publication Types', 'Publication Types', 1, CURRENT_TIMESTAMP),
('vc-wiley-5', 'WILEY', 'T&F Publications last year', 'Taylor & Francis Publications', 1, CURRENT_TIMESTAMP),
('vc-wiley-6', 'WILEY', 'Conflict of Interest', 'Conflict of Interest', 1, CURRENT_TIMESTAMP),
('vc-wiley-7', 'WILEY', 'Retraction History', 'Retraction History', 1, CURRENT_TIMESTAMP),
('vc-wiley-8', 'WILEY', 'Study Type Detection', 'Study Type Detection', 1, CURRENT_TIMESTAMP),
('vc-wiley-9', 'WILEY', 'Sanction Country', 'Sanction Country Check', 1, CURRENT_TIMESTAMP),

-- F1000 user type
('vc-f1000-1', 'F1000', 'Publications', 'Publications', 1, CURRENT_TIMESTAMP),
('vc-f1000-2', 'F1000', 'First/Last Author in publications', 'First/Last Author Publications', 1, CURRENT_TIMESTAMP),
('vc-f1000-3', 'F1000', 'Relevant Publications', 'Relevant Publications', 1, CURRENT_TIMESTAMP),
('vc-f1000-4', 'F1000', 'Publication Types', 'Publication Types', 1, CURRENT_TIMESTAMP),
('vc-f1000-5', 'F1000', 'T&F Publications last year', 'Taylor & Francis Publications', 1, CURRENT_TIMESTAMP),
('vc-f1000-6', 'F1000', 'Conflict of Interest', 'Conflict of Interest', 1, CURRENT_TIMESTAMP),
('vc-f1000-7', 'F1000', 'Retraction History', 'Retraction History', 1, CURRENT_TIMESTAMP),
('vc-f1000-8', 'F1000', 'Study Type Detection', 'Study Type Detection', 1, CURRENT_TIMESTAMP),
('vc-f1000-9', 'F1000', 'Sanction Country', 'Sanction Country Check', 1, CURRENT_TIMESTAMP),

-- DMP user type
('vc-dmp-1', 'DMP', 'Publications', 'Publications', 1, CURRENT_TIMESTAMP),
('vc-dmp-2', 'DMP', 'First/Last Author in publications', 'First/Last Author Publications', 1, CURRENT_TIMESTAMP),
('vc-dmp-3', 'DMP', 'Relevant Publications', 'Relevant Publications', 1, CURRENT_TIMESTAMP),
('vc-dmp-4', 'DMP', 'Publication Types', 'Publication Types', 1, CURRENT_TIMESTAMP),
('vc-dmp-5', 'DMP', 'T&F Publications last year', 'Taylor & Francis Publications', 1, CURRENT_TIMESTAMP),
('vc-dmp-6', 'DMP', 'Conflict of Interest', 'Conflict of Interest', 1, CURRENT_TIMESTAMP),
('vc-dmp-7', 'DMP', 'Retraction History', 'Retraction History', 1, CURRENT_TIMESTAMP),
('vc-dmp-8', 'DMP', 'Study Type Detection', 'Study Type Detection', 1, CURRENT_TIMESTAMP),
('vc-dmp-9', 'DMP', 'Sanction Country', 'Sanction Country Check', 1, CURRENT_TIMESTAMP),

-- AJE RQE user type
('vc-aje-1', 'AJE RQE', 'Publications', 'Publications', 1, CURRENT_TIMESTAMP),
('vc-aje-2', 'AJE RQE', 'First/Last Author in publications', 'First/Last Author Publications', 1, CURRENT_TIMESTAMP),
('vc-aje-3', 'AJE RQE', 'Relevant Publications', 'Relevant Publications', 1, CURRENT_TIMESTAMP),
('vc-aje-4', 'AJE RQE', 'Publication Types', 'Publication Types', 1, CURRENT_TIMESTAMP),
('vc-aje-5', 'AJE RQE', 'T&F Publications last year', 'Taylor & Francis Publications', 1, CURRENT_TIMESTAMP),
('vc-aje-6', 'AJE RQE', 'Conflict of Interest', 'Conflict of Interest', 1, CURRENT_TIMESTAMP),
('vc-aje-7', 'AJE RQE', 'Retraction History', 'Retraction History', 1, CURRENT_TIMESTAMP),
('vc-aje-8', 'AJE RQE', 'Study Type Detection', 'Study Type Detection', 1, CURRENT_TIMESTAMP),
('vc-aje-9', 'AJE RQE', 'Sanction Country', 'Sanction Country Check', 1, CURRENT_TIMESTAMP),

-- T&F user type
('vc-tandf-1', 'T&F', 'Publications', 'Publications', 1, CURRENT_TIMESTAMP),
('vc-tandf-2', 'T&F', 'First/Last Author in publications', 'First/Last Author Publications', 1, CURRENT_TIMESTAMP),
('vc-tandf-3', 'T&F', 'Relevant Publications', 'Relevant Publications', 1, CURRENT_TIMESTAMP),
('vc-tandf-4', 'T&F', 'Publication Types', 'Publication Types', 1, CURRENT_TIMESTAMP),
('vc-tandf-5', 'T&F', 'T&F Publications last year', 'Taylor & Francis Publications', 1, CURRENT_TIMESTAMP),
('vc-tandf-6', 'T&F', 'Conflict of Interest', 'Conflict of Interest', 1, CURRENT_TIMESTAMP),
('vc-tandf-7', 'T&F', 'Retraction History', 'Retraction History', 1, CURRENT_TIMESTAMP),
('vc-tandf-8', 'T&F', 'Study Type Detection', 'Study Type Detection', 1, CURRENT_TIMESTAMP),
('vc-tandf-9', 'T&F', 'Sanction Country', 'Sanction Country Check', 1, CURRENT_TIMESTAMP);
