CREATE TABLE "investment_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"option_type" varchar(100) NOT NULL,
	"option_name" varchar(255) NOT NULL,
	"description" text,
	"base_amount" numeric(15, 2) NOT NULL,
	"family_pricing" jsonb,
	"holding_period_months" integer,
	"conditions" jsonb,
	"eligibility_requirements" jsonb,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "selected_investment_option_id" uuid;--> statement-breakpoint
ALTER TABLE "crbi_programs" ADD COLUMN "program_details" jsonb;--> statement-breakpoint
ALTER TABLE "investment_options" ADD CONSTRAINT "investment_options_program_id_crbi_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."crbi_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "investment_options_program_idx" ON "investment_options" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "investment_options_type_idx" ON "investment_options" USING btree ("option_type");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_selected_investment_option_id_investment_options_id_fk" FOREIGN KEY ("selected_investment_option_id") REFERENCES "public"."investment_options"("id") ON DELETE no action ON UPDATE no action;