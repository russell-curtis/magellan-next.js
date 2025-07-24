CREATE TABLE "client_auth" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_login" timestamp,
	"invited_at" timestamp DEFAULT now(),
	"invited_by_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_auth_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firm_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"application_id" uuid,
	"title" varchar(255),
	"status" varchar(50) DEFAULT 'active',
	"priority" varchar(20) DEFAULT 'normal',
	"assigned_advisor_id" text,
	"last_message_at" timestamp,
	"last_message_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"recipient_type" varchar(20) NOT NULL,
	"recipient_advisor_id" text,
	"recipient_client_id" uuid,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"is_delivered" boolean DEFAULT false,
	"delivered_at" timestamp,
	"notification_sent" boolean DEFAULT false,
	"notification_sent_at" timestamp,
	"notification_type" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "message_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"participant_type" varchar(20) NOT NULL,
	"advisor_id" text,
	"client_id" uuid,
	"last_read_at" timestamp,
	"last_read_message_id" uuid,
	"is_active" boolean DEFAULT true,
	"joined_at" timestamp DEFAULT now(),
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"content" text NOT NULL,
	"message_type" varchar(50) DEFAULT 'text',
	"sender_type" varchar(20) NOT NULL,
	"sender_advisor_id" text,
	"sender_client_id" uuid,
	"file_url" text,
	"file_name" varchar(255),
	"file_size" bigint,
	"content_type" varchar(100),
	"is_edited" boolean DEFAULT false,
	"edited_at" timestamp,
	"is_deleted" boolean DEFAULT false,
	"deleted_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "client_auth" ADD CONSTRAINT "client_auth_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_auth" ADD CONSTRAINT "client_auth_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_advisor_id_users_id_fk" FOREIGN KEY ("assigned_advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_notifications" ADD CONSTRAINT "message_notifications_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_notifications" ADD CONSTRAINT "message_notifications_recipient_advisor_id_users_id_fk" FOREIGN KEY ("recipient_advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_notifications" ADD CONSTRAINT "message_notifications_recipient_client_id_clients_id_fk" FOREIGN KEY ("recipient_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_participants" ADD CONSTRAINT "message_participants_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_participants" ADD CONSTRAINT "message_participants_advisor_id_users_id_fk" FOREIGN KEY ("advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_participants" ADD CONSTRAINT "message_participants_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_participants" ADD CONSTRAINT "message_participants_last_read_message_id_messages_id_fk" FOREIGN KEY ("last_read_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_advisor_id_users_id_fk" FOREIGN KEY ("sender_advisor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_client_id_clients_id_fk" FOREIGN KEY ("sender_client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_auth_email_idx" ON "client_auth" USING btree ("email");--> statement-breakpoint
CREATE INDEX "client_auth_client_id_idx" ON "client_auth" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "conversations_firm_id_idx" ON "conversations" USING btree ("firm_id");--> statement-breakpoint
CREATE INDEX "conversations_client_id_idx" ON "conversations" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "conversations_status_idx" ON "conversations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_last_message_idx" ON "conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "notifications_message_idx" ON "message_notifications" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_advisor_idx" ON "message_notifications" USING btree ("recipient_advisor_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_client_idx" ON "message_notifications" USING btree ("recipient_client_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "message_notifications" USING btree ("is_read","created_at");--> statement-breakpoint
CREATE INDEX "participants_conversation_idx" ON "message_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "participants_advisor_idx" ON "message_participants" USING btree ("advisor_id");--> statement-breakpoint
CREATE INDEX "participants_client_idx" ON "message_participants" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "unique_advisor_participant" ON "message_participants" USING btree ("conversation_id","advisor_id");--> statement-breakpoint
CREATE INDEX "unique_client_participant" ON "message_participants" USING btree ("conversation_id","client_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_advisor_idx" ON "messages" USING btree ("sender_advisor_id");--> statement-breakpoint
CREATE INDEX "messages_sender_client_idx" ON "messages" USING btree ("sender_client_id");--> statement-breakpoint
CREATE INDEX "messages_type_idx" ON "messages" USING btree ("message_type");