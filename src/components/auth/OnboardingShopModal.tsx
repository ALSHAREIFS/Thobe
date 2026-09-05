import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Store, Building, MapPin, Phone, ArrowRight, AlertCircle, Scissors } from 'lucide-react';

export const OnboardingShopModal: React.FC = () => {
  const { createShopForUser, signOut, authError, clearAuthError } = useAuth();
  const [shopName, setShopName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('الرياض');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      await createShopForUser({
        shopName,
        phone,
        city,
        address,
      });
    } catch (err: any) {
      setLocalErr(err.message || 'فشل تهيئة المحل');
    } finally {
      setIsSubmitting(false);
    }
  };

  const err = localErr || authError;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-white">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1A365D] border border-blue-400/40 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Scissors className="w-6 h-6 text-blue-300" />
          </div>
          <h2 className="text-xl font-black">تهيئة متجر الخياطة الخاص بك</h2>
          <p className="text-xs text-slate-400 mt-1">
            مرحباً بك! لإكمال الدخول لمنصة ثوبي، يرجى إدخال اسم المحل والفرع.
          </p>
        </div>

        {err && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{err}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">اسم محل الخياطة *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="مثال: خياط الأصالة للثياب"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف / الجوال *</label>
              <input
                type="tel"
                required
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0501234567"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-left"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">المدينة *</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-400 font-bold"
              >
                {['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'القصيم', 'أبها', 'تبوك'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">العنوان</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="الشارع والحي"
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => signOut()}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
            >
              تسجيل الخروج
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#1A365D] hover:bg-[#204373] text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'إنشاء وحفظ المحل'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
