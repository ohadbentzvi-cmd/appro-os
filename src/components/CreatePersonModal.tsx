import React from 'react';
import CreatePersonForm, { Person } from './CreatePersonForm';

interface CreatePersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (person: Person) => void;
}

export default function CreatePersonModal({ isOpen, onClose, onSuccess }: CreatePersonModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
                <div className="p-1">
                    <CreatePersonForm
                        onSuccess={onSuccess}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </div>
    );
}
