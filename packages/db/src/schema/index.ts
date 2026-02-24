export * from './tenants'
export * from './buildings'
export * from './units'
export * from './people'
export * from './unit-roles'
export * from './app-roles'
export * from './payment-config'
export * from './charges'
export * from './payments'

import { tenants } from './tenants'
import { buildings } from './buildings'
import { units } from './units'
import { people } from './people'
import { unitRoles } from './unit-roles'
import { appRoles } from './app-roles'
import { unitPaymentConfig } from './payment-config'
import { charges } from './charges'
import { payments } from './payments'

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

export type UnitPaymentConfig = typeof unitPaymentConfig.$inferSelect
export type NewUnitPaymentConfig = typeof unitPaymentConfig.$inferInsert

export type Charge = typeof charges.$inferSelect
export type NewCharge = typeof charges.$inferInsert

export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert

