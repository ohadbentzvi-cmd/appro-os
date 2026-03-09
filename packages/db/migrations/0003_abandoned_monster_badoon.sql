DROP INDEX "people_phone_unique_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "people_tenant_phone_unique_idx" ON "people" USING btree ("tenant_id","phone");