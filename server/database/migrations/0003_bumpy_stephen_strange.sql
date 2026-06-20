CREATE TABLE "job_destinations" (
	"job_id" uuid NOT NULL,
	"destination_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_destinations_job_id_destination_id_pk" PRIMARY KEY("job_id","destination_id")
);
--> statement-breakpoint
ALTER TABLE "backup_jobs" DROP CONSTRAINT "backup_jobs_destination_id_backup_destinations_id_fk";
--> statement-breakpoint
ALTER TABLE "job_destinations" ADD CONSTRAINT "job_destinations_job_id_backup_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."backup_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_destinations" ADD CONSTRAINT "job_destinations_destination_id_backup_destinations_id_fk" FOREIGN KEY ("destination_id") REFERENCES "public"."backup_destinations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "job_destinations" ("job_id", "destination_id", "created_at")
SELECT "id", "destination_id", NOW()
FROM "backup_jobs"
WHERE "destination_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "backup_jobs" DROP COLUMN "destination_id";