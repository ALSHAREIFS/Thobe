import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Scissors,
  Store,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building2,
  AlertCircle,
  Clock,
  Send,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { signIn, submitRegistrationRequest, sendPasswordReset, authError, clearAuthError, loading } = useAuth();

  const [tab, setTab] = useState<'login' | 'request' | 'forgot'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Request form state
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [shopName, setShopName] = useState('');
  const [city, setCity] = useState('الرياض');
  const [notes, setNotes] = useState('');
  const [requestPassword, setRequestPassword] = useState('');
  const [requestConfirmPassword, setRequestConfirmPassword] = useState('');
  const [showRequestPassword, setShowRequestPassword] = useState(false);
  const [showRequestConfirmPassword, setShowRequestConfirmPassword] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Local message state
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
    } catch (err: any) {
      setLocalError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (requestPassword.length < 6) {
      setLocalError('كلمة المرور يجب أن تكون ٦ خانات على الأقل');
      return;
    }

    if (requestPassword !== requestConfirmPassword) {
      setLocalError('كلمة المرور وتأكيد كلمة المرور غير متطابقتين');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRegistrationRequest({
        ownerName,
        shopName,
        email: ownerEmail,
        phone: ownerPhone,
        city,
        password: requestPassword,
        notes,
      });
      // Clear password values from memory
      setRequestPassword('');
      setRequestConfirmPassword('');
      setRequestSubmitted(true);
    } catch (err: any) {
      setLocalError(err.message || 'فشل إرسال طلب الانضمام');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();
    setIsSubmitting(true);
    try {
      await sendPasswordReset(forgotEmail);
      setResetSent(true);
    } catch (err: any) {
      setLocalError(err.message || 'فشل إرسال رابط الاستعادة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 select-none" dir="rtl">
      {/* Background Ambience */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-2xl border border-stone-200/80 overflow-hidden">
        
        {/* Left/Sidebar Panel: SaaS Platform Hero */}
        <div className="lg:col-span-5 bg-[#1A365D] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl shadow-inner">
                ث
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">ثوبي SaaS</h1>
                <p className="text-xs text-blue-200">المنصة السحابية المتكاملة لإدارة محلات الخياطة الرجالية</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10 text-xs leading-relaxed text-blue-100">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 shrink-0 text-white">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">بيئة سحابية معزولة تماماً</div>
                  <div className="text-blue-200 mt-0.5">
                    كل محل يمتلك قاعدة بيانات مستقلة ومحمية بقواعد أمان Firestore الصارمة لمنع أي تداخل.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 shrink-0 text-white">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">إدارة مركزية من مالك المنصة</div>
                  <div className="text-blue-200 mt-0.5">
                    إنشاء وتفعيل المحلات يتم بإشراف واعتماد إدارة المنصة لضمان الجودة وحماية المشتركين.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/10 shrink-0 text-white">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">سجل مقاسات وفواتير إلكترونية</div>
                  <div className="text-blue-200 mt-0.5">
                    إدارة شاملة لدورات التفصيل، المقاسات، طباعة كروت العمل، وسندات القبض المتوافقة.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-300">
            <span>منصة ثوبي © 2026</span>
            <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md text-white">v2.4 Multi-Tenant</span>
          </div>
        </div>

        {/* Right Panel: Authentication & Registration Forms */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-stone-50/50">
          {/* Tabs */}
          <div className="flex bg-stone-200/80 p-1 rounded-2xl mb-6 max-w-md mx-auto w-full">
            <button
              onClick={() => {
                setTab('login');
                setLocalError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
                tab === 'login'
                  ? 'bg-[#1A365D] text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              تسجيل الدخول
            </button>

            <button
              onClick={() => {
                setTab('request');
                setLocalError(null);
                clearAuthError();
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all ${
                tab === 'request'
                  ? 'bg-[#1A365D] text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              طلب اشتراك جديد
            </button>
          </div>

          {/* Error Message */}
          {(localError || authError) && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-bold">{localError || authError}</div>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto w-full">
              <div className="text-right space-y-1 mb-2">
                <h2 className="text-lg font-black text-stone-900">تسجيل الدخول للنظام</h2>
                <p className="text-xs text-stone-500">أدخل بريدك الإلكتروني وكلمة المرور المعتمدة من إدارة المنصة</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@tailor.sa"
                    className="w-full pr-10 pl-4 py-3 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] focus:ring-1 focus:ring-[#1A365D] shadow-sm text-left font-mono"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700">كلمة المرور</label>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('forgot');
                      setForgotEmail(loginEmail);
                    }}
                    className="text-[11px] font-bold text-[#1A365D] hover:underline"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    dir="ltr"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pr-10 pl-4 py-3 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] focus:ring-1 focus:ring-[#1A365D] shadow-sm text-left font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-3.5 bg-[#1A365D] hover:bg-[#204373] text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                {isSubmitting || loading ? (
                  <span>جاري التحقق والدخول...</span>
                ) : (
                  <>
                    <span>تسجيل الدخول</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>

              <div className="pt-4 text-center">
                <p className="text-xs text-stone-500">
                  ليس لديك متجر مسجل بعد؟{' '}
                  <button
                    type="button"
                    onClick={() => setTab('request')}
                    className="font-bold text-[#1A365D] hover:underline"
                  >
                    قدّم طلب اشتراك جديد
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: REQUEST REGISTRATION (SaaS Public Request) */}
          {tab === 'request' && (
            <div className="max-w-md mx-auto w-full">
              {requestSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-4 animate-in fade-in">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-emerald-950">تم استلام طلب اشتراك متجرك بنجاح!</h3>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      طلبك قيد المراجعة حالياً لدى إدارة منصة "ثوبي". سيتم تفعيل حسابك ومتجرك فور اعتماد الطلب.
                    </p>
                  </div>
                  <div className="p-3.5 bg-white rounded-2xl border border-emerald-200 text-[11px] text-stone-600 text-right space-y-1.5">
                    <div className="font-bold text-stone-800">الخطوات القادمة:</div>
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">١</span>
                      <span>مراجعة بيانات المحل واعتماد الطلب من قِبل الإدارة.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">٢</span>
                      <span>إنشاء مساحة متجرك المستقلة وتفعيل الحساب تلقائياً.</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-stone-700">
                      <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center">٣</span>
                      <span>يمكنك تسجيل الدخول مباشرة بنفس البريد الإلكتروني وكلمة المرور التي حددتها.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setRequestSubmitted(false);
                      setTab('login');
                    }}
                    className="w-full py-3 bg-[#1A365D] hover:bg-[#204373] text-white text-xs font-bold rounded-xl shadow-md transition-all"
                  >
                    الانتقال لصفحة تسجيل الدخول
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-3.5">
                  <div className="text-right space-y-1 mb-2">
                    <h2 className="text-lg font-black text-stone-900">طلب اشتراك متجر جديد</h2>
                    <p className="text-xs text-stone-500">
                      قدّم بيانات محلك وحدد كلمة المرور الخاصة بك، وسيتم تفعيل حسابك السحابي بعد اعتماد الإدارة
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">اسم المحل أو الخياط *</label>
                    <div className="relative">
                      <Store className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="مثال: خياط الفخامة للأثواب"
                        className="w-full pr-9 pl-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">اسم المالك / المدير *</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="الاسم الثلاثي"
                          className="w-full pr-9 pl-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">المدينة *</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full pr-9 pl-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] font-bold"
                        >
                          {['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'القصيم', 'أبها', 'تبوك', 'حائل', 'أخرى'].map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">رقم الجوال *</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          required
                          dir="ltr"
                          value={ownerPhone}
                          onChange={(e) => setOwnerPhone(e.target.value)}
                          placeholder="05XXXXXXXX"
                          className="w-full pr-9 pl-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] text-left font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">البريد الإلكتروني *</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        <input
                          type="email"
                          required
                          dir="ltr"
                          value={ownerEmail}
                          onChange={(e) => setOwnerEmail(e.target.value)}
                          placeholder="owner@tailor.sa"
                          className="w-full pr-9 pl-3 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] text-left font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passwords for Account Creation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">كلمة المرور للحساب *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        <input
                          type={showRequestPassword ? 'text' : 'password'}
                          required
                          dir="ltr"
                          minLength={6}
                          value={requestPassword}
                          onChange={(e) => setRequestPassword(e.target.value)}
                          placeholder="٦ خانات على الأقل"
                          className="w-full pr-9 pl-9 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] text-left font-mono"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowRequestPassword(!showRequestPassword)}
                          className="absolute left-3 top-3 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          {showRequestPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">تأكيد كلمة المرور *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                        <input
                          type={showRequestConfirmPassword ? 'text' : 'password'}
                          required
                          dir="ltr"
                          minLength={6}
                          value={requestConfirmPassword}
                          onChange={(e) => setRequestConfirmPassword(e.target.value)}
                          placeholder="تأكيد كلمة المرور"
                          className="w-full pr-9 pl-9 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] text-left font-mono"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowRequestConfirmPassword(!showRequestConfirmPassword)}
                          className="absolute left-3 top-3 text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          {showRequestConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">ملاحظات أو تفاصيل إضافية (اختياري)</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="عدد الفروع، عدد المكائن أو أي متطلبات خاصة..."
                      className="w-full p-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-[#1A365D] hover:bg-[#204373] text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {isSubmitting ? (
                      <span>جاري تسجيل الحساب وإرسال الطلب...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>إرسال طلب الاشتراك للإدارة</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <div className="max-w-md mx-auto w-full space-y-4">
              <div className="text-right space-y-1">
                <h2 className="text-lg font-black text-stone-900">استعادة كلمة المرور</h2>
                <p className="text-xs text-stone-500">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور</p>
              </div>

              {resetSent ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs space-y-3">
                  <div className="font-bold">تم إرسال رابط إعادة التعيين بنجاح!</div>
                  <p>يرجى تفقد بريدك الإلكتروني وصندوق البريد الوارد أو المهمل واتباع التعليمات.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setResetSent(false);
                      setTab('login');
                    }}
                    className="w-full py-2 bg-[#1A365D] text-white font-bold rounded-xl text-xs"
                  >
                    العودة لتسجيل الدخول
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
                      <input
                        type="email"
                        required
                        dir="ltr"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="name@tailor.sa"
                        className="w-full pr-10 pl-4 py-3 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#1A365D] shadow-sm text-left font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTab('login')}
                      className="px-4 py-3 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-3 bg-[#1A365D] hover:bg-[#204373] text-white font-black text-xs rounded-xl shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'جاري الإرسال...' : 'إرسال رابط التعيين'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
