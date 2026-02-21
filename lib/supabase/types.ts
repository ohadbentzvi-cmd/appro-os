export interface Building {
    id: string;
    name: string;
    address_street: string;
    address_city: string;
    num_floors: number;
    num_units: number;
    built_year: number | null;
    created_at: string;
}

export interface Unit {
    id: string;
    building_id: string;
    unit_number: string;
    floor: number;
    created_at: string;
}

export interface Person {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    created_at: string;
}

export interface UnitRole {
    id: string;
    unit_id: string;
    person_id: string;
    role_type: 'owner' | 'tenant';
    effective_from: string;
    effective_to: string | null;
    created_at: string;
}
