import { relations } from "drizzle-orm/relations";
import { buildings, units, people, unitRoles } from "./schema";

export const unitsRelations = relations(units, ({one, many}) => ({
	building: one(buildings, {
		fields: [units.buildingId],
		references: [buildings.id]
	}),
	unitRoles: many(unitRoles),
}));

export const buildingsRelations = relations(buildings, ({many}) => ({
	units: many(units),
}));

export const unitRolesRelations = relations(unitRoles, ({one}) => ({
	person: one(people, {
		fields: [unitRoles.personId],
		references: [people.id]
	}),
	unit: one(units, {
		fields: [unitRoles.unitId],
		references: [units.id]
	}),
}));

export const peopleRelations = relations(people, ({many}) => ({
	unitRoles: many(unitRoles),
}));