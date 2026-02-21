export * from './tenants'
export * from './buildings'
export * from './units'
export * from './people'
export * from './unit-roles'
export * from './app-roles'

import { tenants } from './tenants'
import { buildings } from './buildings'
import { units } from './units'
import { people } from './people'
import { unitRoles } from './unit-roles'
import { appRoles } from './app-roles'

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert

export type Building = typeof buildings.$inferSelect
export type NewBuilding = typeof buildings.$inferInsert

export type Unit = typeof units.$inferSelect
export type NewUnit = typeof units.$inferInsert

export type Person = typeof people.$inferSelect
export type NewPerson = typeof people.$inferInsert

export type UnitRole = typeof unitRoles.$inferSelect
export type NewUnitRole = typeof unitRoles.$inferInsert

export type AppRole = typeof appRoles.$inferSelect
export type NewAppRole = typeof appRoles.$inferInsert
