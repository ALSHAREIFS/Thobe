import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TailorService } from '../../services/firebaseService';
import { Shop, ShopRequest, ShopStatus, SHOP_STATUS_MAP } from '../../types';
import {
  ShieldAlert,
  Store,
  Users,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  LogOut,
  Sparkles,
  Key,
  Copy,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  Clock,
  Layers,
  ChevronLeft,
  ExternalLink,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Lock,
} from 'lucide-react';

export const PlatformAdminDashboard: React.FC = () => {
  const { signOut, currentUser, firebaseUser, selectShopForAdmin, sendVerificationEmail, reloadAuthUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'requests' | 'shops' | 'new_shop' | 'security'>('requests');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ShopRequest[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShopStatus>('ALL');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [sendingVerification, setSendingVerification] = useState(false);
  const [reloadingAuth, setReloadingAuth] = useState(false);

  // Approval Modal State
  const [approvingRequest, setApprovingRequest] = useState<ShopRequest | null>(null);
  const [initialPassword, setInitialPassword] = useState('Thobi@2026');
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    shopName: string;
    email: string;
    password: string;
    shopId: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Status Toggle Modal State (Suspend / Reactivate)
  const [statusModalShop, setStatusModalShop] = useState<{ shop: Shop; nextStatus: ShopStatus } | null>(null);

  // Reject Request Modal State
  const [rejectModalRequest, setRejectModalRequest] = useState<ShopRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('لم يستوفِ الشروط المحددة');

  // Manual Shop Creation Form
  const [manualShopName, setManualShopName] = useState('');
  const [manualCity, setManualCity] = useState('الرياض');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCrNumber, setManualCrNumber] = useState('');
  const [manualTaxNumber, setManualTaxNumber] = useState('');
  const [manualOwnerName, setManualOwnerName] = useState('');
  const [manualOwnerEmail, setManualOwnerEmail] = useState('');
  const [manualOwnerPhone, setManualOwnerPhone] = useState('');
  const [manualOwnerPassword, setManualOwnerPassword] = useState('Thobi@2026');

  const loadPlatformData = useCallback(async () => {
    try {
      setLoading(true);
      setActionErrorMessage(null);
      const [reqs, allShops] = await Promise.all([
        TailorService.getShopRequests(),
        TailorService.adminGetAllShops(),
      ]);
      setRequests(reqs);
      setShops(allShops);
    } catch (err: any) {
      console.error('Error loading platform admin data:', err);
      setActionErrorMessage(err.message || 'فشل تحميل بيانات لوحة إدارة المنصة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlatformData();
  }, [loadPlatformData]);

  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingRequest) return;
    setIsProcessing(true);
    setActionErrorMessage(null);
    try {
      const res = await TailorService.adminCreateShopAndOwner(
        {
          name: approvingRequest.shopName,
          phone: approvingRequest.phone,
          city: approvingRequest.city,
        },
        {
          fullName: approvingRequest.ownerName,
          email: approvingRequest.email,
          phone: approvingRequest.phone,
          initialPassword: initialPassword,
        },
        approvingRequest.requestId
      );

      setGeneratedCredentials({
        shopName: res.shop.name,
        email: approvingRequest.email,
        password: initialPassword,
        shopId: res.shop.shopId,
      });

      setActionSuccessMessage(`تمت الموافقة وتفعيل متجر "${res.shop.name}" بنجاح!`);
      await loadPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'فشل اعتماد الطلب وتفعيل المتجر');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenRejectModal = (req: ShopRequest) => {
    setRejectModalRequest(req);
    setRejectionReason('لم يستوفِ الشروط والمعايير المحددة');
  };

  const executeRejectRequest = async () => {
    if (!rejectModalRequest) return;
    try {
      setIsProcessing(true);
      await TailorService.rejectShopRequest(rejectModalRequest.requestId, rejectionReason);
      setActionSuccessMessage(`تم رفض طلب متجر "${rejectModalRequest.shopName}" وتحديث حالته.`);
      setRejectModalRequest(null);
      await loadPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'فشل رفض الطلب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenToggleStatus = (shop: Shop) => {
    const nextStatus: ShopStatus = shop.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setStatusModalShop({ shop, nextStatus });
  };

  const executeToggleShopStatus = async () => {
    if (!statusModalShop) return;
    const { shop, nextStatus } = statusModalShop;
    try {
      setIsProcessing(true);
      await TailorService.adminUpdateShopStatus(shop.shopId, nextStatus);
      setActionSuccessMessage(`تم تحديث حالة متجر "${shop.name || shop.shopName}" إلى: ${SHOP_STATUS_MAP[nextStatus].label}`);
      setStatusModalShop(null);
      await loadPlatformData();
    } catch (err: any) {
      console.error('Error updating shop status:', err);
      setActionErrorMessage(err.message || 'فشل تحديث حالة المتجر');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResyncShopOwner = async (shop: Shop) => {
    try {
      setIsProcessing(true);
      setActionErrorMessage(null);
      await TailorService.adminResyncShopOwner(shop.shopId);
      setActionSuccessMessage(`تمت مزامنة وتثبيت صلاحية المالك (SHOP) لمتجر "${shop.name || shop.shopName}" بنجاح!`);
      await loadPlatformData();
    } catch (err: any) {
      console.error('Error resyncing shop owner:', err);
      setActionErrorMessage(err.message || 'فشل مزامنة حساب المالك');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setActionErrorMessage(null);
    try {
      const res = await TailorService.adminCreateShopAndOwner(
        {
          name: manualShopName,
          phone: manualOwnerPhone,
          city: manualCity,
          address: manualAddress,
          crNumber: manualCrNumber,
          taxNumber: manualTaxNumber,
        },
        {
          fullName: manualOwnerName,
          email: manualOwnerEmail,
          phone: manualOwnerPhone,
          initialPassword: manualOwnerPassword,
        }
      );

      setGeneratedCredentials({
        shopName: res.shop.name,
        email: manualOwnerEmail,
        password: manualOwnerPassword,
        shopId: res.shop.shopId,
      });

      // Reset form
      setManualShopName('');
      setManualOwnerName('');
      setManualOwnerEmail('');
      setManualOwnerPhone('');
      setManualAddress('');
      setManualCrNumber('');
      setManualTaxNumber('');

      setActionSuccessMessage(`تم إنشاء وتفعيل متجر "${res.shop.name}" بنجاح!`);
      await loadPlatformData();
    } catch (err: any) {
      setActionErrorMessage(err.message || 'فشل إنشاء المتجر');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!generatedCredentials) return;
    const text = `بيانات الدخول إلى منصة ثوبي:\nالمتجر: ${generatedCredentials.shopName}\nالبريد الإلكتروني: ${generatedCredentials.email}\nكلمة المرور المؤقتة: ${generatedCredentials.password}\nمعرف المتجر: ${generatedCredentials.shopId}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendVerificationEmail = async () => {
    try {
      setSendingVerification(true);
      setActionErrorMessage(null);
      await sendVerificationEmail();
      setActionSuccessMessage('تم إرسال رابط تأكيد البريد الإلكتروني بنجاح! يرجى فحص صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها Spam).');
    } catch (err: any) {
      setActionErrorMessage(err.message || 'فشل إرسال رابط تأكيد البريد الإلكتروني');
    } finally {
      setSendingVerification(false);
    }
  };

  const handleReloadAuth = async () => {
    try {
      setReloadingAuth(true);
      setActionErrorMessage(null);
      const isVerified = await reloadAuthUser();
      if (isVerified) {
        setActionSuccessMessage('تهانينا! تم تأكيد البريد الإلكتروني بنجاح وأصبح الحساب موثقاً بالكامل (Email Verified).');
        await loadPlatformData();
      } else {
        setActionErrorMessage('لم يتم العثور على تأكيد للبريد بعد. يرجى الضغط على الرابط المرسل إلى بريدك أولاً ثم إعادة المحاولة.');
      }
    } catch (err: any) {
      setActionErrorMessage(err.message || 'فشل تحديث حالة الحساب');
    } finally {
      setReloadingAuth(false);
    }
  };

  // Metrics
  const totalShopsCount = shops.length;
  const activeShopsCount = shops.filter((s) => s.status === 'ACTIVE').length;
  const suspendedShopsCount = shops.filter((s) => s.status === 'SUSPENDED').length;
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;

  const filteredShops = shops.filter((s) => {
    const matchSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shopName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.ownerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shopId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#1A365D] selection:text-white" dir="rtl">
      {/* Platform Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-[#1A365D] border border-blue-400/40 text-white flex items-center justify-center font-black text-xl shadow-lg">
              ث
            </div>
            <div>
              <div className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                <span>لوحة تحكم إدارة منصة "ثوبي"</span>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  SUPER_ADMIN
                </span>
              </div>
              <div className="text-xs text-slate-400">
                إدارة المحلات، قبول الطلبات، وتأمين العزل السحابي (Multi-Tenant SaaS Controller)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <div className="text-xs font-bold text-slate-200">{firebaseUser?.email}</div>
              {firebaseUser?.emailVerified ? (
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Email Verified • Root Authority
                </div>
              ) : (
                <div className="text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Email Unverified (تحقق مطلوب)
                </div>
              )}
            </div>

            <button
              onClick={loadPlatformData}
              disabled={loading}
              title="تحديث البيانات"
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3.5 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/60 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Email Verification Required Banner */}
        {firebaseUser && !firebaseUser.emailVerified && (
          <div className="p-5 bg-gradient-to-r from-amber-950/90 via-amber-900/60 to-slate-900 border-2 border-amber-500/60 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Mail className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="font-black text-amber-300 text-sm flex items-center gap-2">
                  <span>تأكيد البريد الإلكتروني مطلوب لتفعيل صلاحيات الـ Super Admin بالكامل</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    email_verified: false
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  تفرض قواعد الأمان في Firestore شرط التحقق التام من البريد الإلكتروني (<code className="text-amber-300 font-mono text-[11px]">{firebaseUser.email}</code>) لحظر أي تلاعب بصلاحيات الإدارة. اضغط على الزر لإرسال رابط التحقق إلى بريدك.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={handleSendVerificationEmail}
                disabled={sendingVerification}
                className="flex-1 md:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {sendingVerification ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                <span>{sendingVerification ? 'جاري إرسال الرابط...' : 'إرسال رابط التحقق للبريد'}</span>
              </button>

              <button
                type="button"
                onClick={handleReloadAuth}
                disabled={reloadingAuth}
                className="flex-1 md:flex-none px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${reloadingAuth ? 'animate-spin' : ''}`} />
                <span>تحديث حالة التحقق</span>
              </button>
            </div>
          </div>
        )}

        {/* Success / Error Alerts */}
        {actionSuccessMessage && (
          <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-2xl flex items-center justify-between text-emerald-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>{actionSuccessMessage}</span>
            </div>
            <button onClick={() => setActionSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {actionErrorMessage && (
          <div className="p-4 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-between text-red-200 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>{actionErrorMessage}</span>
            </div>
            <button onClick={() => setActionErrorMessage(null)} className="text-red-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">إجمالي المحلات</div>
              <div className="text-2xl font-black text-white">{totalShopsCount}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">المحلات النشطة</div>
              <div className="text-2xl font-black text-emerald-400">{activeShopsCount}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
              <PauseCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">المحلات المعلقة</div>
              <div className="text-2xl font-black text-rose-400">{suspendedShopsCount}</div>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-bold">طلبات قيد المراجعة</div>
              <div className="text-2xl font-black text-amber-400">{pendingRequestsCount}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'requests'
                ? 'bg-[#1A365D] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>طلبات الانضمام والتسجيل</span>
            {pendingRequestsCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-slate-950 font-black rounded-full">
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('shops')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'shops'
                ? 'bg-[#1A365D] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>إدارة المحلات المشتركة ({totalShopsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('new_shop')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'new_shop'
                ? 'bg-[#1A365D] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء وتفعيل متجر يدوياً</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-xl transition-all whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#1A365D] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>تقرير الأمان وعزل البيانات</span>
          </button>
        </div>

        {/* TAB 1: REGISTRATION REQUESTS */}
        {activeTab === 'requests' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>قائمة طلبات تسجيل المحلات الجديدة</span>
                  <span className="text-xs font-normal text-slate-400">
                    (تصل من صفحة التسجيل العامة، وتتطلب موافقتك لإنشاء المحل)
                  </span>
                </h2>
              </div>
            </div>

            {requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Clock className="w-12 h-12 mx-auto text-slate-600 mb-2 opacity-50" />
                <div className="font-bold text-sm">لا توجد أي طلبات انضمام حالياً</div>
                <div className="text-xs text-slate-500 mt-1">أي طلب يرسله مستخدم عام سيظهر هنا للمراجعة والموافقة</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 rounded-tr-xl">اسم المحل</th>
                      <th className="p-3.5">المالك ومقدم الطلب</th>
                      <th className="p-3.5">البريد الإلكتروني</th>
                      <th className="p-3.5">رقم الجوال</th>
                      <th className="p-3.5">المدينة</th>
                      <th className="p-3.5">تاريخ الطلب</th>
                      <th className="p-3.5">الحالة</th>
                      <th className="p-3.5 text-center rounded-tl-xl">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {requests.map((req) => (
                      <tr key={req.requestId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-blue-400" />
                            <span>{req.shopName}</span>
                          </div>
                          {req.notes && (
                            <div className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-1">
                              ملاحظات: {req.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-300 font-bold">{req.ownerName}</td>
                        <td dir="ltr" className="p-3.5 font-mono text-slate-400 text-right">{req.email}</td>
                        <td dir="ltr" className="p-3.5 font-mono text-slate-300 text-right">{req.phone}</td>
                        <td className="p-3.5 text-slate-300">{req.city}</td>
                        <td className="p-3.5 text-slate-400">
                          {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                        </td>
                        <td className="p-3.5">
                          {req.status === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-950 text-amber-400 border border-amber-800/60">
                              قيد المراجعة
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                              تم الاعتماد والتفعيل
                            </span>
                          )}
                          {req.status === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-950 text-rose-400 border border-rose-800/60">
                              مرفوض
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {req.status === 'PENDING' ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setApprovingRequest(req);
                                  setInitialPassword('Thobi@2026');
                                }}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>موافقة وإنشاء</span>
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(req)}
                                className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold rounded-lg text-xs border border-rose-800/60"
                              >
                                رفض
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">مكتمل</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SHOPS MANAGEMENT */}
        {activeTab === 'shops' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث باسم المتجر، المدينة، المالك، أو المعرف..."
                  className="w-full pr-10 pl-4 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">تصفية:</span>
                {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      statusFilter === st
                        ? 'bg-[#1A365D] text-white border-blue-400/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'الكل' : SHOP_STATUS_MAP[st]?.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredShops.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                <Store className="w-12 h-12 mx-auto text-slate-600 mb-2 opacity-50" />
                <div className="font-bold text-sm">لا توجد محلات مطابقة لمعايير البحث</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredShops.map((shop) => (
                  <div
                    key={shop.shopId}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      shop.status === 'SUSPENDED'
                        ? 'bg-rose-950/20 border-rose-800/50'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-white text-sm flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>{shop.name || shop.shopName}</span>
                          </h3>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            ID: {shop.shopId}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            shop.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                              : 'bg-rose-950 text-rose-400 border-rose-800/60'
                          }`}
                        >
                          {SHOP_STATUS_MAP[shop.status]?.label || shop.status}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-300 border-t border-slate-900 pt-2.5">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>المدينة:</span>
                          <span className="text-white font-bold">{shop.city || 'الرياض'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-400">
                          <span>المالك:</span>
                          <span className="text-white font-bold">{shop.ownerName || 'مالك المتجر'}</span>
                        </div>
                        {shop.ownerEmail && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>البريد:</span>
                            <span dir="ltr" className="text-slate-300 font-mono text-[11px]">{shop.ownerEmail}</span>
                          </div>
                        )}
                        {shop.phone && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>الجوال:</span>
                            <span dir="ltr" className="text-slate-300 font-mono text-[11px]">{shop.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleOpenToggleStatus(shop)}
                        disabled={isProcessing}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                          shop.status === 'ACTIVE'
                            ? 'bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60'
                            : 'bg-emerald-800 hover:bg-emerald-700 text-white shadow-md'
                        }`}
                      >
                        {shop.status === 'ACTIVE' ? (
                          <>
                            <PauseCircle className="w-3.5 h-3.5" />
                            <span>تعليق المحل</span>
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3.5 h-3.5" />
                            <span>إعادة تفعيل</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleResyncShopOwner(shop)}
                        disabled={isProcessing}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 rounded-xl border border-slate-700 transition-all text-xs font-bold flex items-center gap-1"
                        title="مزامنة وتثبيت صلاحية المالك (SHOP) في قاعدة البيانات"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>تثبيت المالك</span>
                      </button>

                      <button
                        onClick={() => selectShopForAdmin(shop)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-all text-xs font-bold flex items-center gap-1"
                        title="الدخول كمدير واستعراض لوحة المحل"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>معاينة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANUAL SHOP PROVISIONING */}
        {activeTab === 'new_shop' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>إنشاء وتفعيل متجر جديد مباشرة بواسطة الإدارة</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                يقوم هذا الإجراء بإنشاء مستند المتجر، حساب Firebase Auth للمالك، وتهيئة العزل التام للبيانات.
              </p>
            </div>

            <form onSubmit={handleManualCreateShop} className="space-y-5">
              {/* Section 1: Shop Data */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-blue-400" />
                  <span>بيانات المتجر والمعمل</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم المحل *</label>
                    <input
                      type="text"
                      required
                      value={manualShopName}
                      onChange={(e) => setManualShopName(e.target.value)}
                      placeholder="مثال: خياط الأصالة للأثواب"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">المدينة *</label>
                    <select
                      value={manualCity}
                      onChange={(e) => setManualCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-400 font-bold"
                    >
                      {['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'القصيم', 'أبها', 'تبوك', 'حائل', 'نجران', 'جازان'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">العنوان والشارع</label>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      placeholder="شارع العليا العام"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">السجل التجاري (اختياري)</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={manualCrNumber}
                      onChange={(e) => setManualCrNumber(e.target.value)}
                      placeholder="1010000000"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-left"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Owner Data */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>بيانات صاحب المحل (Owner Credentials)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">اسم المالك الكامل *</label>
                    <input
                      type="text"
                      required
                      value={manualOwnerName}
                      onChange={(e) => setManualOwnerName(e.target.value)}
                      placeholder="محمد سالم الغامدي"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">رقم الجوال *</label>
                    <input
                      type="tel"
                      required
                      dir="ltr"
                      value={manualOwnerPhone}
                      onChange={(e) => setManualOwnerPhone(e.target.value)}
                      placeholder="0501234567"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-left font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">البريد الإلكتروني للدخول *</label>
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={manualOwnerEmail}
                      onChange={(e) => setManualOwnerEmail(e.target.value)}
                      placeholder="owner@asala-tailor.sa"
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">كلمة المرور الابتدائية *</label>
                    <input
                      type="text"
                      required
                      dir="ltr"
                      value={manualOwnerPassword}
                      onChange={(e) => setManualOwnerPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-left font-mono"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-[#1A365D] hover:bg-[#204373] text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span>جاري إنشاء المتجر وحساب المالك...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>تأكيد إنشاء المتجر وتوليد بيانات الدخول</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: SECURITY & ISOLATION REPORT */}
        {activeTab === 'security' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>تقرير هيكلة الأمان والعزل السحابي (Multi-Tenant Security Architecture)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تأكيد تطبيق القواعد المشددة في Firestore Security Rules وقفل الثغرات بالكامل
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-black text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>منع إنشاء المحلات بدون إذن (No Public Shop Creation)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  تم ضبط قاعدة `shops/{'{shopId}'}` بـ `allow create: if isSuperAdmin();`. لا يمكن لأي مستخدم عام
                  أو مستخدم مسجل إنشاء محل فعال مباشرة عبر الواجهة أو عبر الـ SDK.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-black text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>طابور الطلبات المعلقة (Registration Request Gate)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  أي تسجيل عام ينشئ فقط مستند `shopRequests/{'{id}'}` بحالة إجبارية `status == 'PENDING'`. لا
                  يستطيع صاحب الطلب تعديل الحالة إلى `APPROVED` أو تعيين أي متجر.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-black text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>العزل الصارم بين المحلات (Zero-Trust Isolation)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  يتم التحقق من `belongsToShop(shopId)` في كل قراءة وكتابة. حتى لو حاول مستخدم متجر A تعديل
                  الـ URL أو الـ State لطلب متجر B، يُرفض الطلب فوراً برمز `PERMISSION_DENIED`.
                </p>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="text-xs font-black text-blue-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>تعليق المحلات من الخادم (Server-Side Shop Suspension)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  عند تغيير حالة المحل إلى `SUSPENDED` بواسطة الـ Super Admin، تتوقف جميع صلاحيات القراءة
                  والكتابة لجميع موظفي ومالك المحل على مستوى محرك قاعدة البيانات السحابية.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* APPROVAL & CREDENTIALS MODAL */}
      {approvingRequest && !generatedCredentials && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>اعتماد طلب المحل وإنشاء الحساب</span>
              </h3>
              <button onClick={() => setApprovingRequest(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">اسم المتجر:</span>
                <span className="text-white font-bold">{approvingRequest.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">صاحب المتجر:</span>
                <span className="text-white font-bold">{approvingRequest.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">البريد الإلكتروني:</span>
                <span dir="ltr" className="text-white font-mono">{approvingRequest.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">المدينة:</span>
                <span className="text-white">{approvingRequest.city}</span>
              </div>
            </div>

            <form onSubmit={handleApproveRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  كلمة المرور المؤقتة لصاحب المحل:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <input
                    type="text"
                    required
                    dir="ltr"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-left"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  سيتم إنشاء حساب Firebase Auth بهذا البريد وكلمة المرور وتفعيل المتجر.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingRequest(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {isProcessing ? 'جاري التفعيل...' : 'تأكيد الموافقة والتفعيل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATED CREDENTIALS SUCCESS MODAL */}
      {generatedCredentials && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-800/80 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-black text-white text-base">تم إنشاء وتفعيل المتجر بنجاح!</h3>
              <p className="text-xs text-slate-400 mt-1">
                تم تفعيل حساب المالك على Firebase Auth والمتجر في Firestore. يمكنك الآن نسخ البيانات وإرسالها للمالك.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-right space-y-2 text-xs font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">اسم المتجر:</span>
                <span className="text-white font-bold">{generatedCredentials.shopName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">البريد الإلكتروني:</span>
                <span dir="ltr" className="text-emerald-400 font-mono">{generatedCredentials.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">كلمة المرور:</span>
                <span dir="ltr" className="text-amber-400 font-mono">{generatedCredentials.password}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">معرف المتجر (Shop ID):</span>
                <span className="text-slate-300 font-mono text-[10px]">{generatedCredentials.shopId}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-600 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-md"
              >
                {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'تم النسخ للحافظة!' : 'نسخ بيانات الدخول للمالك'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGeneratedCredentials(null);
                  setApprovingRequest(null);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATUS TOGGLE CONFIRMATION MODAL (SUSPEND / REACTIVATE) */}
      {statusModalShop && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  statusModalShop.nextStatus === 'SUSPENDED'
                    ? 'bg-rose-950/80 border border-rose-800 text-rose-400'
                    : 'bg-emerald-950/80 border border-emerald-800 text-emerald-400'
                }`}
              >
                {statusModalShop.nextStatus === 'SUSPENDED' ? (
                  <PauseCircle className="w-6 h-6" />
                ) : (
                  <PlayCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-black text-white text-base">
                  {statusModalShop.nextStatus === 'SUSPENDED' ? 'تعليق نشاط المتجر' : 'إعادة تفعيل المتجر'}
                </h3>
                <p className="text-xs text-slate-400">
                  متجر "{statusModalShop.shop.name || statusModalShop.shop.shopName}"
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs leading-relaxed text-slate-300">
              {statusModalShop.nextStatus === 'SUSPENDED' ? (
                <div className="space-y-2">
                  <p className="text-rose-300 font-bold">
                    هل أنت متأكد من تعليق هذا المتجر؟
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    سيتم حفظ الحالة فوراً في Firestore ومنع صاحب المتجر وجميع موظفيه من الدخول إلى النظام وإجراء أي عمليات بيع أو تقارير، مع إظهار شاشة التعليق المخصصة.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-emerald-300 font-bold">
                    هل ترغب في إعادة تفعيل هذا المتجر؟
                  </p>
                  <p className="text-slate-400 text-[11px]">
                    سيتم رفع التعليق واستئناف وصول المالك والموظفين إلى النظام بشكل طبيعي وفوري عبر خادم Firestore.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStatusModalShop(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeToggleShopStatus}
                disabled={isProcessing}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                  statusModalShop.nextStatus === 'SUSPENDED'
                    ? 'bg-rose-700 hover:bg-rose-600 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                }`}
              >
                {isProcessing
                  ? 'جاري الحفظ...'
                  : statusModalShop.nextStatus === 'SUSPENDED'
                  ? 'تأكيد التعليق'
                  : 'تأكيد إعادة التفعيل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REQUEST MODAL */}
      {rejectModalRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-white text-base text-rose-400">رفض طلب تسجيل المتجر</h3>
              <button
                onClick={() => setRejectModalRequest(null)}
                disabled={isProcessing}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              أنت على وشك رفض طلب متجر <strong className="text-white">"{rejectModalRequest.shopName}"</strong> المقدم من <strong className="text-white">{rejectModalRequest.ownerName}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">سبب الرفض:</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                placeholder="اكتب سبب الرفض هنا..."
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRejectModalRequest(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeRejectRequest}
                disabled={isProcessing || !rejectionReason.trim()}
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
              >
                {isProcessing ? 'جاري الحفظ...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
