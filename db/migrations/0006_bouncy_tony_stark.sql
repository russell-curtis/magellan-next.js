CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"document_requirement_id" uuid,
	"filename" varchar(255) NOT NULL,
	"original_filename" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" bigint,
	"content_type" varchar(100),
	"file_hash" varchar(256),
	"uploaded_at" timestamp DEFAULT now(),
	"uploaded_by_type" varchar(20) NOT NULL,
	"uploaded_by_id" text,
	"status" varchar(50) DEFAULT 'uploaded',
	"review_status" varchar(50),
	"reviewed_by_id" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"document_date" date,
	"expiration_date" date,
	"version" integer DEFAULT 1,
	"is_latest_version" boolean DEFAULT true,
	"replaces_document_id" uuid,
	"ocr_processed" boolean DEFAULT false,
	"ocr_text" text,
	"ocr_confidence" numeric(5, 2),
	"compliance_checked" boolean DEFAULT false,
	"compliance_status" varchar(50),
	"compliance_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_workflow_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"current_stage_id" uuid,
	"overall_progress" numeric(5, 2) DEFAULT '0',
	"started_at" timestamp DEFAULT now(),
	"estimated_completion_at" timestamp,
	"actual_completion_at" timestamp,
	"status" varchar(50) DEFAULT 'in_progress',
	"custom_stages_added" jsonb,
	"stage_overrides" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_document_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"created_by_id" text NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"is_required" boolean DEFAULT true,
	"due_date" date,
	"priority" varchar(20) DEFAULT 'medium',
	"instructions" text,
	"accepted_formats" text[],
	"max_file_size_mb" integer DEFAULT 10,
	"status" varchar(50) DEFAULT 'pending',
	"fulfilled_at" timestamp,
	"waived_at" timestamp,
	"waived_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"stage_id" uuid,
	"document_name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"is_required" boolean DEFAULT true,
	"is_client_uploadable" boolean DEFAULT true,
	"accepted_formats" text[],
	"max_file_size_mb" integer DEFAULT 10,
	"validation_rules" jsonb,
	"expiration_months" integer,
	"sort_order" integer DEFAULT 0,
	"display_group" varchar(100),
	"help_text" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"reviewer_id" text NOT NULL,
	"review_type" varchar(50) NOT NULL,
	"review_result" varchar(50) NOT NULL,
	"review_notes" text,
	"feedback" text,
	"rejection_reason" varchar(100),
	"quality_score" integer,
	"checks_performed" jsonb,
	"time_spent_minutes" integer,
	"is_system_generated" boolean DEFAULT false,
	"reviewed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "program_workflow_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"template_name" varchar(255) NOT NULL,
	"description" text,
	"total_stages" integer NOT NULL,
	"estimated_time_months" integer,
	"is_active" boolean DEFAULT true,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stage_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"completion_percentage" numeric(5, 2) DEFAULT '0',
	"started_at" timestamp,
	"completed_at" timestamp,
	"estimated_duration_days" integer,
	"actual_duration_days" integer,
	"total_documents_required" integer DEFAULT 0,
	"documents_uploaded" integer DEFAULT 0,
	"documents_approved" integer DEFAULT 0,
	"documents_rejected" integer DEFAULT 0,
	"notes" text,
	"blocked_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workflow_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"stage_order" integer NOT NULL,
	"stage_name" varchar(255) NOT NULL,
	"description" text,
	"estimated_days" integer,
	"is_required" boolean DEFAULT true,
	"can_skip" boolean DEFAULT false,
	"auto_progress" boolean DEFAULT false,
	"depends_on_stages" uuid[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_document_requirement_id_document_requirements_id_fk" FOREIGN KEY ("document_requirement_id") REFERENCES "public"."document_requirements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_replaces_document_id_application_documents_id_fk" FOREIGN KEY ("replaces_document_id") REFERENCES "public"."application_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_workflow_progress" ADD CONSTRAINT "application_workflow_progress_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_workflow_progress" ADD CONSTRAINT "application_workflow_progress_template_id_program_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."program_workflow_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_workflow_progress" ADD CONSTRAINT "application_workflow_progress_current_stage_id_workflow_stages_id_fk" FOREIGN KEY ("current_stage_id") REFERENCES "public"."workflow_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_document_requirements" ADD CONSTRAINT "custom_document_requirements_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_document_requirements" ADD CONSTRAINT "custom_document_requirements_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_program_id_crbi_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."crbi_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_requirements" ADD CONSTRAINT "document_requirements_stage_id_workflow_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."workflow_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_document_id_application_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."application_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_reviews" ADD CONSTRAINT "document_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_workflow_templates" ADD CONSTRAINT "program_workflow_templates_program_id_crbi_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."crbi_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_progress" ADD CONSTRAINT "stage_progress_stage_id_workflow_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."workflow_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_stages" ADD CONSTRAINT "workflow_stages_template_id_program_workflow_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."program_workflow_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_documents_application_idx" ON "application_documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "app_documents_requirement_idx" ON "application_documents" USING btree ("document_requirement_id");--> statement-breakpoint
CREATE INDEX "app_documents_status_idx" ON "application_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "app_documents_review_status_idx" ON "application_documents" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "app_documents_latest_version_idx" ON "application_documents" USING btree ("is_latest_version");--> statement-breakpoint
CREATE INDEX "workflow_progress_application_idx" ON "application_workflow_progress" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "workflow_progress_stage_idx" ON "application_workflow_progress" USING btree ("current_stage_id");--> statement-breakpoint
CREATE INDEX "workflow_progress_status_idx" ON "application_workflow_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "custom_doc_requirements_application_idx" ON "custom_document_requirements" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "custom_doc_requirements_created_by_idx" ON "custom_document_requirements" USING btree ("created_by_id");--> statement-breakpoint
CREATE INDEX "custom_doc_requirements_status_idx" ON "custom_document_requirements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "doc_requirements_program_stage_idx" ON "document_requirements" USING btree ("program_id","stage_id");--> statement-breakpoint
CREATE INDEX "doc_requirements_category_idx" ON "document_requirements" USING btree ("category");--> statement-breakpoint
CREATE INDEX "doc_requirements_required_idx" ON "document_requirements" USING btree ("is_required");--> statement-breakpoint
CREATE INDEX "document_reviews_document_idx" ON "document_reviews" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_reviews_reviewer_idx" ON "document_reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "document_reviews_result_idx" ON "document_reviews" USING btree ("review_result");--> statement-breakpoint
CREATE INDEX "workflow_templates_program_idx" ON "program_workflow_templates" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "workflow_templates_active_idx" ON "program_workflow_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "stage_progress_app_stage_idx" ON "stage_progress" USING btree ("application_id","stage_id");--> statement-breakpoint
CREATE INDEX "stage_progress_status_idx" ON "stage_progress" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workflow_stages_template_order_idx" ON "workflow_stages" USING btree ("template_id","stage_order");