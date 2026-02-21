import { pgTable, uuid, text, integer, timestamp, foreignKey, check, date, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const buildings = pgTable("buildings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	addressStreet: text("address_street").notNull(),
	addressCity: text("address_city").notNull(),
	numFloors: integer("num_floors").notNull(),
	numUnits: integer("num_units").notNull(),
	builtYear: integer("built_year"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	tenantId: uuid("tenant_id").default(sql`'00000000-0000-0000-0000-000000000000'`).notNull(),
});

export const units = pgTable("units", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	buildingId: uuid("building_id").notNull(),
	unitNumber: text("unit_number").notNull(),
	floor: integer().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.buildingId],
			foreignColumns: [buildings.id],
			name: "units_building_id_fkey"
		}).onDelete("cascade"),
]);

export const people = pgTable("people", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	fullName: text("full_name").notNull(),
	email: text(),
	phone: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const unitRoles = pgTable("unit_roles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	unitId: uuid("unit_id").notNull(),
	personId: uuid("person_id").notNull(),
	roleType: text("role_type").notNull(),
	effectiveFrom: date("effective_from").notNull(),
	effectiveTo: date("effective_to"),
	isFeePayer: boolean("is_fee_payer").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.personId],
			foreignColumns: [people.id],
			name: "unit_roles_person_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.unitId],
			foreignColumns: [units.id],
			name: "unit_roles_unit_id_fkey"
		}).onDelete("cascade"),
	check("unit_roles_role_type_check", sql`role_type = ANY (ARRAY['owner'::text, 'tenant'::text])`),
]);
