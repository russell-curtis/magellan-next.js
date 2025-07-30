ALTER TABLE "applications" ADD COLUMN "government_reference_number" varchar(100);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_status_check" timestamp;