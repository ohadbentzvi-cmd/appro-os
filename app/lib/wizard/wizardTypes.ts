export interface WizardPersonUI {
    first_name: string;
    last_name: string;
    phone: string;
    existing_id?: string;
}

export interface WizardUnitUI {
    unit_number: string;
    floor?: number;
    owner?: WizardPersonUI;
    tenant?: WizardPersonUI;
    fee_payer: 'owner' | 'tenant' | 'none';
    monthly_amount_agorot?: number;
}
