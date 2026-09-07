import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { TailorService } from '../../services/firebaseService';
import { UserProfile, EmployeePermissions, DEFAULT_EMPLOYEE_PERMISSIONS, DEFAULT_MAX_EMPLOYEES } from '../../types';
import {
  Settings as SettingsIcon,
  Store,
  Shield,
  Database,
  Users,
  UserPlus,
  Trash2,
  CheckCircle2,
  XCircle,
  Building,
  Phone,
  MapPin,
  Lock,
  Mail,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Edit3,
  Check,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentShop, currentUser, isSuperAdmin, isShop, updateShopSettings } = useAuth();
  const {
    showToast,
    refreshData,
    refreshEmployees,
    employees,
    addEmployee,
    updateEmployeePermissions,
    toggleEmployeeStatus,
    deleteEmployee,
  } = useShop();

  // Employee Seat Limit State
  const maxEmployees = typeof currentShop?.maxEmployees === 'number' ? currentShop.maxEmployees : DEFAULT_MAX_EMPLOYEES;
  const activeEmployeeCount = typeof currentShop?.employeeCount === 'number'
    ? currentShop.employeeCount
    : employees.filter((e) => e.role === 'EMPLOYEE' && e.isActive !== false).length;
  const isAtLimit = activeEmployeeCount >= maxEmployees;
  const remainingSeats = Math.max(0, maxEmployees - activeEmployeeCount);

  // Shop Settings Form State
  const [shopName, setShopName] = useState(currentShop?.name || currentShop?.shopName || '');
  const [phone, setPhone] = useState(currentShop?.phone || '');
  const [city, setCity] = useState(currentShop?.city || 'الرياض');
  const [address, setAddress] = useState(currentShop?.address || '');
  const [vatNumber, setVatNumber] = useState(currentShop?.taxNumber || currentShop?.vatNumber || '');
  const [crNumber, setCrNumber] = useState(currentShop?.crNumber || '');
  const [defaultDeliveryDays, setDefaultDeliveryDays] = useState(currentShop?.defaultDeliveryDays || 5);
  const [saving, setSaving] = useState(false);

  // New Employee Modal State
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empPermissions, setEmpPermissions] = useState<EmployeePermissions>({
    customers: true,
    measurements: true,
    orders: true,
    payments: false,
    reports: false,
  });
  const [addingEmp, setAddingEmp] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  // Edit Employee Permissions Modal State
  const [editingEmp, setEditingEmp] = useState<UserProfile | null>(null);
  const [editPermissionsState, setEditPermissionsState] = useState<EmployeePermissions>(DEFAULT_EMPLOYEE_PERMISSIONS);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Action Loading tracking
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Custom Confirmation Modal States (iFrame-safe)
  const [empToToggle, setEmpToToggle] = useState<{ emp: UserProfile; nextStatus: boolean } | null>(null);
  const [empToDelete, setEmpToDelete] = useState<UserProfile | null>(null);

  const canManage = isSuperAdmin || isShop;

  useEffect(() => {
    if (currentShop) {
      setShopName(currentShop.name || currentShop.shopName || '');
      setPhone(currentShop.phone || '');
      setCity(currentShop.city || 'الرياض');
      setAddress(currentShop.address || '');
      setVatNumber(currentShop.taxNumber || currentShop.vatNumber || '');
      setCrNumber(currentShop.crNumber || '');
      setDefaultDeliveryDays(currentShop.defaultDeliveryDays || 5);
    }
  }, [currentShop]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop?.shopId || !canManage) return;
    setSaving(true);
    try {
      await updateShopSettings({
        name: shopName,
        shopName: shopName,
        phone,
        city,
        address,
        taxNumber: vatNumber,
        vatNumber,
        crNumber,
        defaultDeliveryDays,
      });
      showToast('تم حفظ إعدادات المحل بنجاح', 'success');
    } catch (err: any) {
      showToast(err.message || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShop?.shopId || !canManage) return;
    setEmpError(null);

    if (isAtLimit) {
      setEmpError(`لا يمكن إضافة موظف جديد: لقد وصلت إلى الحد الأقصى للمقاعد (${activeEmployeeCount} من ${maxEmployees}).`);
      return;
    }

    if (empPassword.length < 6) {
      setEmpError('كلمة مرور الموظف يجب أن تكون 6 أحرف أو أرقام على الأقل');
      return;
    }

    setAddingEmp(true);
    try {
      await addEmployee(
        {
          fullName: empName.trim(),
          email: empEmail.trim().toLowerCase(),
          phone: empPhone.trim(),
          permissions: empPermissions,
        },
        empPassword
      );

      setShowAddEmpModal(false);
      setEmpName('');
      setEmpEmail('');
      setEmpPassword('');
      setEmpPhone('');
      setEmpPermissions({
        customers: true,
        measurements: true,
        orders: true,
        payments: false,
        reports: false,
      });
    } catch (err: any) {
      setEmpError(err.message || 'فشل إنشاء حساب الموظف');
    } finally {
      setAddingEmp(false);
    }
  };

  const openEditPermissionsModal = (emp: UserProfile) => {
    setEditingEmp(emp);
    setEditPermissionsState({
      customers: !!emp.permissions?.customers,
      measurements: !!emp.permissions?.measurements,
      orders: !!emp.permissions?.orders,
      payments: !!emp.permissions?.payments,
      reports: !!emp.permissions?.reports,
    });
  };

  const handleSavePermissions = async () => {
    if (!editingEmp || !currentShop?.shopId || !canManage) return;
    setSavingPermissions(true);
    try {
      await updateEmployeePermissions(editingEmp.userId, editPermissionsState);
      setEditingEmp(null);
    } catch (err: any) {
      // Toast shown in context
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleToggleActiveStatus = (emp: UserProfile) => {
    if (!currentShop?.shopId || !canManage) return;
    const empId = emp.userId || emp.uid;
    const currentId = currentUser?.userId || currentUser?.uid;
    if (empId === currentId) {
      showToast('لا يمكنك تعطيل حسابك الشخصي الحالي', 'error');
      return;
    }

    const nextStatus = emp.isActive === false; // If false -> true, If true/undefined -> false
    if (nextStatus && isAtLimit) {
      showToast(
        `لا يمكن إعادة تفعيل حساب الموظف: لقد وصلت إلى الحد الأقصى للمقاعد المتاحة (${activeEmployeeCount} من ${maxEmployees}). يرجى ترقية الخطة أو تعطيل حساب آخر أولاً.`,
        'error'
      );
      return;
    }
    setEmpToToggle({ emp, nextStatus });
  };

  const confirmToggleStatus = async () => {
    if (!empToToggle || !currentShop?.shopId) return;
    const { emp, nextStatus } = empToToggle;
    const empId = emp.userId || emp.uid;
    if (!empId) return;

    setActionLoadingId(empId);
    try {
      await toggleEmployeeStatus(empId, nextStatus);
      setEmpToToggle(null);
    } catch (err) {
      // Toast already handled in context
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteEmployee = (emp: UserProfile) => {
    if (!currentShop?.shopId || !canManage) return;
    const empId = emp.userId || emp.uid;
    const currentId = currentUser?.userId || currentUser?.uid;
    if (empId === currentId) {
      showToast('لا يمكنك حذف حسابك الشخصي الحالي', 'error');
      return;
    }

    setEmpToDelete(emp);
  };

  const confirmDeleteEmployee = async () => {
    if (!empToDelete || !currentShop?.shopId) return;
    const empId = empToDelete.userId || empToDelete.uid;
    if (!empId) return;

    setActionLoadingId(empId);
    try {
      await deleteEmployee(empId);
      setEmpToDelete(null);
    } catch (err) {
      // Toast already handled in context
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-black text-slate-900">غير مصرح بالوصول</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            صفحة الإعدادات وإدارة فريق العمل مخصصة لمالك المتجر والإدارة العامة فقط.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-[#1A365D]" />
          إعدادات المحل وفريق العمل السحابي
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          تخصيص بيانات المتجر والفاتورة، وإدارة حسابات الموظفين وصلاحياتهم الخمس المستقلة
        </p>
      </div>

      {/* 1. Shop Info Form */}
      <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
            <Store className="w-4 h-4 text-[#1A365D]" />
            بيانات المحل وهوية الفواتير
          </h3>
          <span className="text-xs text-slate-400">تظهر هذه البيانات في رأس نموذج أمر التفصيل (A4)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">اسم محل الخياطة *</label>
            <input
              type="text"
              required
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 font-bold focus:bg-white focus:border-[#1A365D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم هاتف / واتساب المحل *</label>
            <input
              type="tel"
              required
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 font-bold focus:bg-white focus:border-[#1A365D] focus:outline-none text-left"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">المدينة</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 font-bold focus:bg-white focus:border-[#1A365D] focus:outline-none"
            >
              {['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام', 'الخبر', 'القصيم', 'أبها', 'تبوك', 'حائل'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">العنوان والفرع</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="الشارع، الحي"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:border-[#1A365D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">مدة التفصيل الافتراضية (أيام)</label>
            <input
              type="number"
              min="1"
              max="30"
              value={defaultDeliveryDays}
              onChange={(e) => setDefaultDeliveryDays(parseInt(e.target.value) || 5)}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:border-[#1A365D] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">الرقم الضريبي (VAT)</label>
            <input
              type="text"
              dir="ltr"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="3000xxxxxxxx0003"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:border-[#1A365D] focus:outline-none text-left"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">رقم السجل التجاري (CR)</label>
            <input
              type="text"
              dir="ltr"
              value={crNumber}
              onChange={(e) => setCrNumber(e.target.value)}
              placeholder="1010xxxxxx"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:border-[#1A365D] focus:outline-none text-left"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#1A365D] hover:bg-[#152C4D] text-white font-black text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ بيانات المحل'}
          </button>
        </div>
      </form>

      {/* 2. Employee & Permissions Management */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#1A365D]" />
              إدارة موظفي المتجر والمقاعد (Staff Seats & Permissions)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              إضافة حسابات الموظفين وتخصيص الصلاحيات الخمس المستقلة (العملاء، المقاسات، الطلبات، المدفوعات، التقارير)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isAtLimit}
              onClick={() => {
                if (isAtLimit) {
                  showToast(`تم الوصول للحد الأقصى لحسابات الموظفين (${maxEmployees} موظف).`, 'error');
                  return;
                }
                setShowAddEmpModal(true);
              }}
              title={isAtLimit ? `تم بلوغ الحد الأقصى لحسابات الموظفين المسموح بها (${maxEmployees} موظفين)` : 'إضافة موظف جديد'}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer ${
                isAtLimit
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-[#1A365D] hover:bg-[#152C4D] text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>
          </div>
        </div>

        {/* Seat Limit Card & Utilization Meter */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isAtLimit
            ? 'bg-amber-50/80 border-amber-300'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                isAtLimit ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-50 text-[#1A365D] border border-blue-200'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <span>المقاعد المستخدمة:</span>
                  <span className="font-mono text-sm font-black text-[#1A365D]">
                    {activeEmployeeCount} من {maxEmployees}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isAtLimit
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {isAtLimit ? 'مكتمل (الحد الأقصى)' : `متبقي ${remainingSeats} مقعد`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  حساب مالك المتجر مستقل ولا يُحتسب ضمن مقاعد الموظفين. تعطيل الموظف يحرر مقعده فوراً.
                </div>
              </div>
            </div>
          </div>

          {/* Seat Bar */}
          <div className="w-full bg-slate-200 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isAtLimit ? 'bg-amber-500' : 'bg-[#1A365D]'
              }`}
              style={{ width: `${Math.min(100, (activeEmployeeCount / Math.max(1, maxEmployees)) * 100)}%` }}
            />
          </div>

          {isAtLimit && (
            <div className="mt-2 text-[11px] text-amber-800 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>لقد وصلت إلى الحد الأقصى لحسابات الموظفين في باقتك ({maxEmployees} من {maxEmployees}). لزيادة المقاعد يرجى التواصل مع إدارة المنصة.</span>
            </div>
          )}
        </div>

        {/* Employee List */}
        <div className="divide-y divide-slate-100">
          {employees.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-600">لا يوجد موظفون مضافون في هذا المتجر حالياً</p>
              <p className="text-[11px] text-slate-400">انقر على "إضافة موظف جديد" لإنشاء أول حساب موظف وتحديد صلاحياته.</p>
            </div>
          ) : (
            employees.map((emp) => {
              const isSelf = emp.userId === currentUser?.userId;
              const isShopOwnerAccount = emp.role === 'SHOP' || emp.userId === currentShop?.ownerUid;
              const isActive = emp.isActive !== false;
              const perms = emp.permissions || DEFAULT_EMPLOYEE_PERMISSIONS;

              return (
                <div key={emp.userId} className="py-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border ${
                        isShopOwnerAccount
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : isActive
                          ? 'bg-blue-50 text-[#1A365D] border-blue-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {emp.fullName ? emp.fullName.charAt(0) : 'E'}
                      </div>

                      <div>
                        <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                          <span>{emp.fullName}</span>
                          {isSelf && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                              أنت
                            </span>
                          )}
                          {/* Role Tag */}
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border ${
                            isShopOwnerAccount
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isShopOwnerAccount ? 'مالك المتجر' : 'موظف'}
                          </span>
                          {/* Status Tag */}
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md border flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {isActive ? 'نشط' : 'معطل'}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                          <span dir="ltr" className="text-right">{emp.email}</span>
                          {emp.phone && <span dir="ltr">• {emp.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for this employee */}
                    {!isShopOwnerAccount && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {/* Edit Permissions Button */}
                        <button
                          type="button"
                          onClick={() => openEditPermissionsModal(emp)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                          <span>تعديل الصلاحيات</span>
                        </button>

                        {/* Toggle Active / Suspended Button */}
                        <button
                          type="button"
                          disabled={actionLoadingId === emp.userId}
                          onClick={() => handleToggleActiveStatus(emp)}
                          title={isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                            isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <UserX className="w-3.5 h-3.5" />
                              <span>تعطيل</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>تفعيل</span>
                            </>
                          )}
                        </button>

                        {/* Delete / Revoke Access Button */}
                        {!isSelf && (
                          <button
                            type="button"
                            disabled={actionLoadingId === emp.userId}
                            onClick={() => handleDeleteEmployee(emp)}
                            title="إزالة وصول الموظف"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5 Permissions Badges Matrix for Employee */}
                  {!isShopOwnerAccount && (
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="text-slate-500 font-bold text-[10px] ml-1">الصلاحيات:</span>

                      <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                        perms.customers
                          ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                          : 'bg-slate-200/60 text-slate-400 border-slate-300 line-through'
                      }`}>
                        {perms.customers && <Check className="w-3 h-3 text-emerald-600" />}
                        العملاء
                      </span>

                      <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                        perms.measurements
                          ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                          : 'bg-slate-200/60 text-slate-400 border-slate-300 line-through'
                      }`}>
                        {perms.measurements && <Check className="w-3 h-3 text-emerald-600" />}
                        المقاسات
                      </span>

                      <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                        perms.orders
                          ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                          : 'bg-slate-200/60 text-slate-400 border-slate-300 line-through'
                      }`}>
                        {perms.orders && <Check className="w-3 h-3 text-emerald-600" />}
                        الطلبات والخياطة
                      </span>

                      <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                        perms.payments
                          ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                          : 'bg-slate-200/60 text-slate-400 border-slate-300 line-through'
                      }`}>
                        {perms.payments && <Check className="w-3 h-3 text-emerald-600" />}
                        سندات القبض والدفع
                      </span>

                      <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                        perms.reports
                          ? 'bg-emerald-100/70 text-emerald-900 border-emerald-300'
                          : 'bg-slate-200/60 text-slate-400 border-slate-300 line-through'
                      }`}>
                        {perms.reports && <Check className="w-3 h-3 text-emerald-600" />}
                        التقارير والمبيعات
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Database & Cloud Diagnostics */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#1A365D]" />
          بيانات الربط السحابي والأمان (Cloud Tenant Diagnostics)
        </h3>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-slate-500 block mb-0.5">معرف المتجر في السحابة (Shop Tenant ID):</span>
              <span dir="ltr" className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 inline-block text-left">
                {currentShop?.shopId || 'غير محدد'}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-0.5">معرف المستخدم الحالي (User UID):</span>
              <span dir="ltr" className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 inline-block text-left">
                {currentUser?.userId || 'غير محدد'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center gap-2 text-emerald-800 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>نظام عزل البيانات السحابي والأدوار (SUPER_ADMIN + SHOP + EMPLOYEE) مفعّل ومحمي.</span>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD NEW EMPLOYEE WITH 5 PERMISSIONS */}
      {showAddEmpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#1A365D]" />
                إضافة موظف جديد وتحديد الصلاحيات
              </h3>
              <button
                type="button"
                onClick={() => setShowAddEmpModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {empError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{empError}</span>
              </div>
            )}

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم الموظف الكامل *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="مثال: المعلم كمال الدين"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#1A365D] font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني للدخول *</label>
                  <input
                    type="email"
                    required
                    dir="ltr"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    placeholder="tailor@thobi.sa"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#1A365D] text-left"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    placeholder="054xxxxxxx"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#1A365D] text-left"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الابتدائية *</label>
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  placeholder="6 خانات على الأقل"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:border-[#1A365D] text-left"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  سيستخدم الموظف هذا البريد وكلمة المرور لتسجيل الدخول إلى المتجر مباشرة.
                </span>
              </div>

              {/* 5 Permissions Checkboxes Selection */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#1A365D]" />
                    <span>تخصيص الصلاحيات الخمس (Permissions) *</span>
                  </label>
                  <div className="flex gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() =>
                        setEmpPermissions({
                          customers: true,
                          measurements: true,
                          orders: true,
                          payments: true,
                          reports: true,
                        })
                      }
                      className="text-blue-600 hover:underline font-bold"
                    >
                      تحديد الكل
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEmpPermissions({
                          customers: false,
                          measurements: false,
                          orders: false,
                          payments: false,
                          reports: false,
                        })
                      }
                      className="text-slate-500 hover:underline"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empPermissions.customers}
                      onChange={(e) =>
                        setEmpPermissions((prev) => ({ ...prev, customers: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">1. سجلات ودليل العملاء (customers)</div>
                      <div className="text-[10px] text-slate-400">إضافة العملاء، تعديل أرقام الجوال، واستعراض ملفاتهم.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empPermissions.measurements}
                      onChange={(e) =>
                        setEmpPermissions((prev) => ({ ...prev, measurements: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">2. أخذ وتعديل المقاسات (measurements)</div>
                      <div className="text-[10px] text-slate-400">تسجيل مقاسات الثوب، التعديل على تفاصيل الطول والوسع والياقة.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empPermissions.orders}
                      onChange={(e) =>
                        setEmpPermissions((prev) => ({ ...prev, orders: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">3. أوامر التفصيل والخياطة (orders)</div>
                      <div className="text-[10px] text-slate-400">إنشاء طلبات تفصيل جديدة، تغيير حالة الإنتاج، وطباعة كرت التفصيل.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empPermissions.payments}
                      onChange={(e) =>
                        setEmpPermissions((prev) => ({ ...prev, payments: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">4. سندات القبض والمدفوعات (payments)</div>
                      <div className="text-[10px] text-slate-400">تسجيل الدفعات النقدية والشبكة، وسندات القبض المالية.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={empPermissions.reports}
                      onChange={(e) =>
                        setEmpPermissions((prev) => ({ ...prev, reports: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">5. التقارير والمبيعات (reports)</div>
                      <div className="text-[10px] text-slate-400">استعراض إحصائيات الإيرادات والمبيعات وسجلات الإنتاج.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addingEmp}
                  className="flex-1 py-2.5 bg-[#1A365D] hover:bg-[#152C4D] text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {addingEmp ? 'جاري الإنشاء والربط...' : 'حفظ وإنشاء الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT EMPLOYEE PERMISSIONS */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#1A365D]" />
                  تعديل صلاحيات الموظف
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{editingEmp.fullName} ({editingEmp.email})</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">حدد الصلاحيات الممنوحة:</span>
                <div className="flex gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() =>
                      setEditPermissionsState({
                        customers: true,
                        measurements: true,
                        orders: true,
                        payments: true,
                        reports: true,
                      })
                    }
                    className="text-blue-600 hover:underline font-bold"
                  >
                    تحديد الكل
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() =>
                      setEditPermissionsState({
                        customers: false,
                        measurements: false,
                        orders: false,
                        payments: false,
                        reports: false,
                      })
                    }
                    className="text-slate-500 hover:underline"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">1. سجلات ودليل العملاء (customers)</span>
                  <input
                    type="checkbox"
                    checked={editPermissionsState.customers}
                    onChange={(e) =>
                      setEditPermissionsState((prev) => ({ ...prev, customers: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">2. أخذ وتعديل المقاسات (measurements)</span>
                  <input
                    type="checkbox"
                    checked={editPermissionsState.measurements}
                    onChange={(e) =>
                      setEditPermissionsState((prev) => ({ ...prev, measurements: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">3. أوامر التفصيل والخياطة (orders)</span>
                  <input
                    type="checkbox"
                    checked={editPermissionsState.orders}
                    onChange={(e) =>
                      setEditPermissionsState((prev) => ({ ...prev, orders: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">4. سندات القبض والمدفوعات (payments)</span>
                  <input
                    type="checkbox"
                    checked={editPermissionsState.payments}
                    onChange={(e) =>
                      setEditPermissionsState((prev) => ({ ...prev, payments: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-xl hover:bg-white transition-colors cursor-pointer">
                  <span className="text-xs font-bold text-slate-800">5. التقارير والمبيعات (reports)</span>
                  <input
                    type="checkbox"
                    checked={editPermissionsState.reports}
                    onChange={(e) =>
                      setEditPermissionsState((prev) => ({ ...prev, reports: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-[#1A365D] focus:ring-[#1A365D]"
                  />
                </label>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={savingPermissions}
                  onClick={handleSavePermissions}
                  className="flex-1 py-2.5 bg-[#1A365D] hover:bg-[#152C4D] text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {savingPermissions ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Toggle Employee Active Status */}
      {empToToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    empToToggle.nextStatus
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                >
                  {empToToggle.nextStatus ? (
                    <UserCheck className="w-6 h-6" />
                  ) : (
                    <UserX className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    {empToToggle.nextStatus ? 'تأكيد تفعيل حساب الموظف' : 'تأكيد تعطيل حساب الموظف'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {empToToggle.emp.fullName} ({empToToggle.emp.email})
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 leading-relaxed font-medium">
                {empToToggle.nextStatus ? (
                  <span>
                    عند التفعيل، سيتم استهلاك مقعد واحد من مقاعد الموظفين المتاحة ({activeEmployeeCount + 1} من {maxEmployees})، ويتمكن الموظف من تسجيل الدخول والوصول للمتجر.
                  </span>
                ) : (
                  <span>
                    عند التعطيل، سيتم إيقاف وصول الموظف فوراً وتحرير مقعده ({Math.max(0, activeEmployeeCount - 1)} من {maxEmployees})، مما يتيح لك استخدامه لإضافة أو تفعيل موظف آخر.
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={actionLoadingId === (empToToggle.emp.userId || empToToggle.emp.uid)}
                  onClick={() => setEmpToToggle(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === (empToToggle.emp.userId || empToToggle.emp.uid)}
                  onClick={confirmToggleStatus}
                  className={`px-6 py-2.5 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors ${
                    empToToggle.nextStatus
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionLoadingId === (empToToggle.emp.userId || empToToggle.emp.uid) ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ التحديث...</span>
                    </>
                  ) : (
                    <>
                      {empToToggle.nextStatus ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      <span>{empToToggle.nextStatus ? 'تأكيد التفعيل' : 'تأكيد التعطيل'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Employee Document */}
      {empToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">إزالة وصول الموظف نهائياً</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {empToDelete.fullName} ({empToDelete.email})
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 leading-relaxed font-medium">
                هل أنت متأكد من إزالة وصول الموظف من هذا المتجر؟ سيتم تعطيل حسابه وإلغاء صلاحياته الخاصة بهذا المتجر فوراً.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={actionLoadingId === (empToDelete.userId || empToDelete.uid)}
                  onClick={() => setEmpToDelete(null)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={actionLoadingId === (empToDelete.userId || empToDelete.uid)}
                  onClick={confirmDeleteEmployee}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-xs disabled:opacity-60 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  {actionLoadingId === (empToDelete.userId || empToDelete.uid) ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>جارٍ الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>تأكيد الإزالة</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
