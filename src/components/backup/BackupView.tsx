import React from 'react';
import { DatabaseBackup } from 'lucide-react';
import { DataBackupSection } from '../settings/DataBackupSection';

export const BackupView: React.FC = () => {
  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <DatabaseBackup className="w-6 h-6 text-[#1A365D]" />
          النسخ الاحتياطي وحماية البيانات
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          احتفظ بنسخة مستقلة من بيانات متجرك وتعرّف على حالة حماية بياناتك.
        </p>
      </div>

      <DataBackupSection />
    </div>
  );
};
