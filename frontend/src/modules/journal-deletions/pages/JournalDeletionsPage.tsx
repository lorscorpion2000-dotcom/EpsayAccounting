import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Shield, Loader2, RefreshCw, Eye, X, FileText,
  AlertTriangle, Clock, User, Hash,
} from 'lucide-react';
import clsx from 'clsx';
import { journalDeletionApi } from '../services/journal-deletion.api';
import type { JournalDeletionLog } from '@/types/journal-deletion';
import { toPersianDigits, formatJalaliDate } from '@/utils/format';

export default function JournalDeletionsPage() {
  const [items, setItems] = useState<JournalDeletionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<JournalDeletionLog | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await journalDeletionApi.list(200);
      setItems(r);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'خطا در بارگذاری');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const fmtNum = (v: any) => {
    if (v === null || v === undefined) return '—';
    const n = Number(v);
    if (!isFinite(n)) return '—';
    return toPersianDigits(n.toLocaleString('en-US'));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-600" />
            سوابق حذف اسناد حسابداری
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            گزارش حذف اسناد — حتی اسناد Posted — همراه با snapshot کامل
          </p>
        </div>
        <button className="btn-secondary" onClick={load}>
          <RefreshCw className="w-4 h-4" /> به‌روزرسانی
        </button>
      </div>

      {/* Info */}
      <div className="card p-4 border-s-4 border-s-red-500 bg-red-50/30">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <div className="font-bold mb-1">گزارش امنیتی</div>
            <div className="text-xs">
              این گزارش تغییرناپذیر است. حذف هر سند حسابداری همراه با متن کامل، خطوط سند و اطلاعات کاربر حذف‌کننده ثبت می‌شود.
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            {toPersianDigits(items.length)} سند حذف‌شده
          </h2>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-1">هیچ سند حذف‌شده‌ای ثبت نشده</p>
            <p className="text-xs text-slate-400">اگر سندی حذف شود، در اینجا نمایش داده می‌شود</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[900px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-center px-3 py-3 w-12 font-medium text-slate-600">#</th>
                  <th className="text-center px-3 py-3 w-36 font-medium text-slate-600">تاریخ حذف</th>
                  <th className="text-center px-3 py-3 w-32 font-medium text-slate-600">شماره سند</th>
                  <th className="text-center px-3 py-3 w-24 font-medium text-slate-600">وضعیت</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600">شرح</th>
                  <th className="text-center px-3 py-3 w-28 font-medium text-slate-600">بدهکار</th>
                  <th className="text-center px-3 py-3 w-28 font-medium text-slate-600">بستانکار</th>
                  <th className="text-center px-3 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((it, i) => (
                  <tr key={it.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 text-center text-slate-400 num">{toPersianDigits(i + 1)}</td>
                    <td className="px-3 py-3 text-center num">{formatJalaliDate(it.deletedAt)}</td>
                    <td className="px-3 py-3 text-center num text-slate-700 font-bold">
                      {it.journalNo || '—'}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded font-bold',
                        it.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' :
                        it.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600',
                      )}>
                        {it.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-left text-slate-700 truncate max-w-xs" dir="rtl">
                      {it.description || '—'}
                    </td>
                    <td className="px-3 py-3 text-center num text-emerald-700 font-medium">
                      {fmtNum(it.totalDebit)}
                    </td>
                    <td className="px-3 py-3 text-center num text-red-700 font-medium">
                      {fmtNum(it.totalCredit)}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => setDetail(it)}
                        className="p-1.5 rounded-lg hover:bg-brand-50 text-brand-600" title="جزئیات">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b bg-red-50 flex items-center justify-between">
              <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                جزئیات سند حذف‌شده
              </h3>
              <button onClick={() => setDetail(null)} className="p-2 rounded hover:bg-white">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto">
              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> تاریخ حذف
                  </div>
                  <div className="font-medium num mt-0.5">{formatJalaliDate(detail.deletedAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3" /> کاربر
                  </div>
                  <div className="font-medium num text-xs mt-0.5" dir="ltr">
                    {detail.deletedBy || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Hash className="w-3 h-3" /> شماره سند
                  </div>
                  <div className="font-medium num mt-0.5">{detail.journalNo || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">وضعیت</div>
                  <div className="font-medium num mt-0.5">{detail.status || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">مجموع بدهکار</div>
                  <div className="font-medium num mt-0.5 text-emerald-700">{fmtNum(detail.totalDebit)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">مجموع بستانکار</div>
                  <div className="font-medium num mt-0.5 text-red-700">{fmtNum(detail.totalCredit)}</div>
                </div>
              </div>

              {detail.reason && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">دلیل حذف</div>
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
                    {detail.reason}
                  </div>
                </div>
              )}

              {detail.description && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">شرح سند</div>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                    {detail.description}
                  </div>
                </div>
              )}

              {/* Lines snapshot */}
              {detail.linesSnapshot && Array.isArray(detail.linesSnapshot) && (
                <div>
                  <div className="text-xs text-slate-500 mb-2">
                    خطوط سند ({toPersianDigits(detail.linesSnapshot.length)} خط)
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-right px-3 py-2 font-medium text-slate-600">حساب</th>
                          <th className="text-center px-3 py-2 w-28 font-medium text-slate-600">بدهکار</th>
                          <th className="text-center px-3 py-2 w-28 font-medium text-slate-600">بستانکار</th>
                          <th className="text-right px-3 py-2 font-medium text-slate-600">شرح</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.linesSnapshot.map((l: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-xs">
                              <span className="num text-slate-500" dir="ltr">{l.accountCode || '—'}</span>
                              {' '}
                              <span className="text-slate-700">{l.accountName || '—'}</span>
                            </td>
                            <td className="px-3 py-2 text-center num text-emerald-700">
                              {Number(l.debit) > 0 ? fmtNum(l.debit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-center num text-red-700">
                              {Number(l.credit) > 0 ? fmtNum(l.credit) : '—'}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-600 text-xs">{l.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Raw JSON */}
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                  مشاهده snapshot خام (JSON)
                </summary>
                <pre className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto text-[10px] num" dir="ltr">
                  {JSON.stringify({ journal: detail.journalSnapshot, lines: detail.linesSnapshot }, null, 2)}
                </pre>
              </details>
            </div>

            <div className="px-6 py-3 border-t bg-slate-50 flex justify-end">
              <button onClick={() => setDetail(null)} className="btn-secondary">بستن</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
