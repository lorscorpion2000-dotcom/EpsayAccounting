import { useEffect, useState } from 'react';

import { toast } from 'sonner';
import { Plus, Search, Loader2, Warehouse as WarehouseIcon, Edit, FolderOpen, MapPin, RefreshCw, Archive } from 'lucide-react';
import clsx from 'clsx';
import { warehouseApi } from '../services/warehouse.api';
import type { Warehouse } from '@/types/warehouse';
import { WAREHOUSE_TYPE_LABELS } from '@/types/warehouse';
import { toPersianDigits } from '@/utils/format';
import WarehouseFormModal from '../components/WarehouseFormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AdminDeleteButton from '@/components/AdminDeleteButton';
export default function WarehousesListPage() {

  const [items, setItems] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [deleting, setDeleting] = useState<Warehouse | null>(null);
  const [forceConfirm, setForceConfirm] = useState(false);
  const [forceError, setForceError] = useState<string | null>(null);
  useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await warehouseApi.warehouses.list();
      setItems(data);
    } catch {
      toast.error('Ø®Ø·Ø§ Ø¯Ø± Ø¨Ø§Ø±Ú¯Ø°Ø§Ø±ÛŒ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (force = false) => {
    if (!deleting) return;
    setForceError(null);
    try {

      toast.success(force ? 'Ø§Ù†Ø¨Ø§Ø± Ø¨Ù‡â€ŒØ·ÙˆØ± Ú©Ø§Ù…Ù„ Ø­Ø°Ù Ø´Ø¯' : 'Ø§Ù†Ø¨Ø§Ø± ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´Ø¯');
      setDeleting(null);
      setForceConfirm(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      const msg = err?.message;
      if (force && typeof msg === 'string' && msg.includes('\n')) {
        setForceError(msg);
      } else {
        toast.error(Array.isArray(msg) ? msg[0] : msg || 'Ø®Ø·Ø§ Ø¯Ø± Ø­Ø°Ù');
      }
    }
  };

  const filtered = search
    ? items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.code.toLowerCase().includes(search.toLowerCase()))
    : items;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <WarehouseIcon className="w-6 h-6 text-brand-600" />
            Ø§Ù†Ø¨Ø§Ø±Ù‡Ø§
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ù…Ø¯ÛŒØ±ÛŒØª Ø§Ù†Ø¨Ø§Ø±Ù‡Ø§ÛŒ Ù…Ø±Ú©Ø²ÛŒ Ùˆ Ú©Ø§Ø±Ú¯Ø§Ù‡ÛŒ</p>
        </div>
        <div className="flex items-center gap-2">
                        <button className="btn-secondary" onClick={load}><RefreshCw className="w-4 h-4" /></button>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Ø§Ù†Ø¨Ø§Ø± Ø¬Ø¯ÛŒØ¯
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ø¬Ø³ØªØ¬Ùˆ..."
            className="input ps-10 pe-4 w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <WarehouseIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">Ù‡ÛŒÚ† Ø§Ù†Ø¨Ø§Ø±ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª</p>
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Ø§ÙˆÙ„ÛŒÙ† Ø§Ù†Ø¨Ø§Ø±
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((wh) => (
            <div key={wh.id} className="card p-5 hover:shadow-card-hover transition-all group relative">
              <div className="absolute top-3 left-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={(e) => { e.stopPropagation(); setEditing(wh); setShowModal(true); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-amber-50 text-slate-600"
                  title="ÙˆÛŒØ±Ø§ÛŒØ´"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleting(wh); }}
                  className="p-1.5 rounded-lg bg-white shadow-sm border hover:bg-red-50 text-slate-600"
                  title="Ø­Ø°Ù"
                >
                  <Archive className="w-3.5 h-3.5" />
                </button>
                        <AdminDeleteButton
                          endpoint="/warehouses"
                          id={wh.id}
                          itemLabel={(wh as any).code || (wh as any).name || (wh as any).title || ''}
                          onSuccess={load}
                        />
              </div>

              <div onClick={() => { setEditing(wh); setShowModal(true); }} className="cursor-pointer">
                <div className="flex items-start gap-3 mb-3">
                  <div className={clsx(
                    'w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0',
                    wh.isActive ? 'bg-gradient-to-br from-brand-500 to-brand-700' : 'bg-gradient-to-br from-slate-400 to-slate-600',
                  )}>
                    <WarehouseIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 line-clamp-1">{wh.name}</div>
                    <div className="text-xs text-slate-500 num" dir="ltr">{wh.code}</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                    <span>{WAREHOUSE_TYPE_LABELS[wh.type]}</span>
                  </div>
                  {wh.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="line-clamp-1">{wh.location}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-400">Ú©Ø§Ù„Ø§</div>
                    <div className="font-bold num">{toPersianDigits(wh._count?.stocks || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Ø±Ø³ÛŒØ¯</div>
                    <div className="font-bold num">{toPersianDigits(wh._count?.receipts || 0)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Ø­ÙˆØ§Ù„Ù‡</div>
                    <div className="font-bold num">{toPersianDigits(wh._count?.issues || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <WarehouseFormModal
        isOpen={showModal}
        editingWarehouse={editing}
        onClose={() => { setShowModal(false); setEditing(null); }}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleting && !forceConfirm}
        title="Ø­Ø°Ù Ø§Ù†Ø¨Ø§Ø±"
        message={deleting ? "Ø§Ù†Ø¨Ø§Ø± Â«" + deleting.name + "Â» ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´ÙˆØ¯ØŸ Ø§ÛŒÙ† Ø¹Ù…Ù„ Ù‚Ø§Ø¨Ù„ Ø¨Ø§Ø²Ú¯Ø´Øª Ø§Ø³Øª." : ""}
        confirmLabel="Ø¨Ù„Ù‡ØŒ ØºÛŒØ±ÙØ¹Ø§Ù„ Ø´ÙˆØ¯"
        variant="danger"
        onConfirm={() => handleDelete(false)}
        onCancel={() => { setDeleting(null); setForceError(null); }}
      />

      {forceError && deleting && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-800">Ø­Ø°Ù Ú©Ø§Ù…Ù„ Ø§Ù†Ø¨Ø§Ø± (Ù…Ø¯ÛŒØ± Ø³ÛŒØ³ØªÙ…)</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700 whitespace-pre-line">{forceError}</p>
              <p className="text-xs text-slate-500">Ø¨Ø§ Ú©Ù„ÛŒÚ© Ø±ÙˆÛŒ Â«Ø­Ø°Ù Ú©Ø§Ù…Ù„Â»ØŒ ØªÙ…Ø§Ù… Ù…ÙˆØ¬ÙˆØ¯ÛŒØŒ Ú¯Ø±Ø¯Ø´ Ùˆ Ø±Ø³ÛŒØ¯/Ø­ÙˆØ§Ù„Ù‡ Ø§ÛŒÙ† Ø§Ù†Ø¨Ø§Ø± Ù¾Ø§Ú© Ù…ÛŒâ€ŒØ´ÙˆØ¯. Ø§Ø·Ù…ÛŒÙ†Ø§Ù† Ø¯Ø§Ø±ÛŒØ¯ØŸ</p>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setForceConfirm(false); setForceError(null); setDeleting(null); }} className="btn-secondary">Ø§Ù†ØµØ±Ø§Ù</button>
                <button onClick={() => handleDelete(true)} className="btn-danger">Ø­Ø°Ù Ú©Ø§Ù…Ù„ (Ø®Ø·Ø±Ù†Ø§Ú©)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
