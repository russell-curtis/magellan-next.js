CREATE TABLE "original_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"document_requirement_id" uuid NOT NULL,
	"digital_document_id" uuid,
	"status" varchar(50) DEFAULT 'digital_approved',
	"requested_at" timestamp,
	"requested_by" text,
	"client_notified_at" timestamp,
	"reminders_sent" integer DEFAULT 0,
	"shipped_at" timestamp,
	"courier_service" varchar(100),
	"tracking_number" varchar(100),
	"shipping_address" text,
	"client_reference" varchar(100),
	"received_at" timestamp,
	"received_by" text,
	"verified_at" timestamp,
	"verified_by" text,
	"document_condition" varchar(50),
	"quality_notes" text,
	"is_authenticated" boolean DEFAULT false,
	"authentication_details" text,
	"deadline" timestamp,
	"is_urgent" boolean DEFAULT false,
	"government_deadline" timestamp,
	"internal_notes" text,
	"client_instructions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "application_documents" ADD COLUMN "quality_validated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "application_documents" ADD COLUMN "quality_score" varchar(20);--> statement-breakpoint
ALTER TABLE "application_documents" ADD COLUMN "quality_issues" jsonb;--> statement-breakpoint
ALTER TABLE "application_documents" ADD COLUMN "quality_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "original_documents" ADD CONSTRAINT "original_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_documents" ADD CONSTRAINT "original_documents_document_requirement_id_document_requirements_id_fk" FOREIGN KEY ("document_requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_documents" ADD CONSTRAINT "original_documents_digital_document_id_application_documents_id_fk" FOREIGN KEY ("digital_document_id") REFERENCES "public"."application_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_documents" ADD CONSTRAINT "original_documents_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_documents" ADD CONSTRAINT "original_documents_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "original_documents" ADD CONSTRAINT "original_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "original_documents_application_idx" ON "original_documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "original_documents_requirement_idx" ON "original_documents" USING btree ("document_requirement_id");--> statement-breakpoint
CREATE INDEX "original_documents_status_idx" ON "original_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "original_documents_deadline_idx" ON "original_documents" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "original_documents_received_idx" ON "original_documents" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "original_documents_tracking_idx" ON "original_documents" USING btree ("tracking_number");