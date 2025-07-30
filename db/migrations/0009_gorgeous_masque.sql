CREATE TABLE "firm_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"invited_by_id" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'advisor' NOT NULL,
	"invitation_code" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"accepted_at" timestamp,
	"accepted_by_id" text,
	"revoked_at" timestamp,
	"revoked_by_id" text,
	"expires_at" timestamp NOT NULL,
	"personal_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "firm_invitations_invitation_code_unique" UNIQUE("invitation_code")
);
--> statement-breakpoint
CREATE TABLE "user_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"firm_id" uuid NOT NULL,
	"can_manage_clients" boolean DEFAULT true,
	"can_manage_applications" boolean DEFAULT true,
	"can_manage_documents" boolean DEFAULT true,
	"can_manage_team" boolean DEFAULT false,
	"can_manage_firm_settings" boolean DEFAULT false,
	"can_view_analytics" boolean DEFAULT true,
	"can_manage_tasks" boolean DEFAULT true,
	"can_access_billing" boolean DEFAULT false,
	"max_clients_limit" integer,
	"max_applications_limit" integer,
	"granted_by_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_permissions_unique_user_firm" UNIQUE("user_id","firm_id")
);
--> statement-breakpoint
CREATE TABLE "user_setup_status" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"has_completed_onboarding" boolean DEFAULT false,
	"has_joined_firm" boolean DEFAULT false,
	"onboarding_step" varchar(50),
	"firm_id" uuid,
	"role_in_firm" varchar(50),
	"onboarding_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_setup_status_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "firm_invitations" ADD CONSTRAINT "firm_invitations_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_invitations" ADD CONSTRAINT "firm_invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_invitations" ADD CONSTRAINT "firm_invitations_accepted_by_id_users_id_fk" FOREIGN KEY ("accepted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_invitations" ADD CONSTRAINT "firm_invitations_revoked_by_id_users_id_fk" FOREIGN KEY ("revoked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_granted_by_id_users_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setup_status" ADD CONSTRAINT "user_setup_status_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_setup_status" ADD CONSTRAINT "user_setup_status_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "firm_invitations_firm_id_idx" ON "firm_invitations" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "firm_invitations_email_idx" ON "firm_invitations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "firm_invitations_status_idx" ON "firm_invitations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "firm_invitations_code_idx" ON "firm_invitations" USING btree ("invitation_code");--> statement-breakpoint
CREATE INDEX "firm_invitations_expires_idx" ON "firm_invitations" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "user_permissions_user_firm_idx" ON "user_permissions" USING btree ("user_id","firm_id");--> statement-breakpoint
CREATE INDEX "user_setup_status_user_id_idx" ON "user_setup_status" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_setup_status_firm_id_idx" ON "user_setup_status" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "user_setup_status_onboarding_idx" ON "user_setup_status" USING btree ("has_completed_onboarding");