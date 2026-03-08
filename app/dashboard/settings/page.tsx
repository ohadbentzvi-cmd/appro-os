import TemplateSettingsPanel from '@/app/components/templates/TemplateSettingsPanel';

export default function SettingsPage() {
    return (
        <div className="max-w-3xl space-y-10">
            <div>
                <h1 className="text-3xl font-bold text-apro-navy">הגדרות מערכת</h1>
                <p className="text-gray-500 mt-1">ניהול תבניות הודעות ותצורת מערכת</p>
            </div>

            <TemplateSettingsPanel />
        </div>
    );
}
