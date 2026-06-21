CREATE TABLE "job_webhooks" (
	"job_id" uuid NOT NULL,
	"webhook_id" uuid NOT NULL,
	CONSTRAINT "job_webhooks_job_id_webhook_id_pk" PRIMARY KEY("job_id","webhook_id")
);
--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "message_template" text;--> statement-breakpoint
ALTER TABLE "job_webhooks" ADD CONSTRAINT "job_webhooks_job_id_backup_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."backup_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_webhooks" ADD CONSTRAINT "job_webhooks_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;