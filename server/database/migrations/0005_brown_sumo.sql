CREATE TABLE "ssh_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer DEFAULT 22 NOT NULL,
	"username" varchar(100) NOT NULL,
	"private_key" jsonb NOT NULL,
	"public_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backup_sources" ADD COLUMN "ssh_connection_id" uuid;--> statement-breakpoint
ALTER TABLE "backup_sources" ADD CONSTRAINT "backup_sources_ssh_connection_id_ssh_connections_id_fk" FOREIGN KEY ("ssh_connection_id") REFERENCES "public"."ssh_connections"("id") ON DELETE set null ON UPDATE no action;