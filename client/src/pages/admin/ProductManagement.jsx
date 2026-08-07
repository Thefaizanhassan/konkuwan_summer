import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { resolveImageUrl } from '../../lib/imageUrl';
import { ASSET_GALLERY } from '../../lib/assetGallery';
import apiClient from '../../services/api';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';

// Page size — also used to compute the drag-and-drop reorder offset, so the
// two must stay in sync.
const PAGE_LIMIT = 20;

export default function ProductManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () =>
      apiClient.get('/admin/products', { params: { page, limit: PAGE_LIMIT } }).then(r => r.data),
  });

//   const createMutation = useMutation({
//     mutationFn: (d) => apiClient.post('/admin/products', d).then(r => r.data),
//     onSuccess: () => { queryClient.invalidateQueries(['admin-products']); handleClose(); },
//   });

//   const updateMutation = useMutation({
//     mutationFn: ({ id, ...d }) => apiClient.put(`/admin/products/${id}`, d).then(r => r.data),
//     onSuccess: () => { queryClient.invalidateQueries(['admin-products']); handleClose(); },
//   });

  const createMutation = useMutation({
    mutationFn: (d) => apiClient.post('/admin/products', d).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => apiClient.put(`/admin/products/${id}`, d).then(r => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });
 
  const unarchiveMutation = useMutation({
    mutationFn: (id) => apiClient.put(`/admin/products/${id}`, { is_active: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/products/${id}/permanent`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
    onError: (err) => alert(err?.response?.data?.message || t('products.deleteFailed')),
  });
 
  const reorderMutation = useMutation({
    mutationFn: ({ ids }) =>
      apiClient.put('/admin/products/reorder', { ids, start: (page - 1) * PAGE_LIMIT }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
    onError: (err) => alert(err?.response?.data?.message || t('products.orderFailed')),
  });
 
  // Drag-and-drop: reorder the current page locally, show it immediately,
  // then persist the new order.
  const handleReorder = (fromIdx, toIdx) => {
    const rows = [...(data?.data || [])];
    const [moved] = rows.splice(fromIdx, 1);
    rows.splice(toIdx, 0, moved);
    queryClient.setQueryData(['admin-products', page], (old) => old ? { ...old, data: rows } : old);
    reorderMutation.mutate({ ids: rows.map(r => r.id) });
  };

  const columns = [
    { header: t('common.name'), accessor: 'name' },
    { header: t('products.botanical'), accessor: 'botanical_name' },
    {
      header: t('products.priceRange'),
      accessor: 'price_min',
      render: (_, row) =>
        row.price_min != null
          ? `₹${row.price_min} – ₹${row.price_max} / ${row.unit}`
          : t('products.onInquiry'),
    },
    {
      header: t('products.active'),
      accessor: 'is_active',
      render: (val) => val
        ? <span className="text-green-600 text-xs font-medium">{t('products.active')}</span>
        : <span className="text-red-500 text-xs font-medium">{t('products.archived')}</span>,
    },
  ];

  const handleEdit = (product) => { setEditingProduct(product); setModalOpen(true); };
  const handleClose = () => { setModalOpen(false); setEditingProduct(null); };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-3xl text-forest">{t('products.title')}</h2>
        <Button onClick={() => setModalOpen(true)}>+ {t('products.addProduct')}</Button>
      </div>

      <p className="text-xs text-muted mb-2">{t('products.dragHint')}</p>
      <DataTable
        columns={columns}
        data={data?.data || []}
        onRowClick={handleEdit}
        isLoading={isLoading}
        onReorder={handleReorder}
        actions={(row) => (
          <span className="flex gap-3 justify-end">
            {row.is_active ? (
              <button
                onClick={(e) => { e.stopPropagation(); if (window.confirm(t('products.confirmArchive'))) archiveMutation.mutate(row.id); }}
                className="text-amber-700 text-sm hover:underline"
              >
                {t('products.archive')}
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); unarchiveMutation.mutate(row.id); }}
                className="text-green-700 text-sm hover:underline"
              >
                {t('products.unarchive')}
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t('products.confirmDelete', { name: row.name }))) deleteMutation.mutate(row.id);
              }}
              className="text-red-600 text-sm hover:underline"
            >
              {t('common.delete')}
            </button>
          </span>
        )}
      />

      <Pagination current={page} total={data?.pagination?.pages} onChange={setPage} />

      {modalOpen && (
        // <ProductFormModal
        //   product={editingProduct}
        //   onClose={handleClose}
        //   onSubmit={(formData) => {
        //     if (editingProduct) {
        //       updateMutation.mutate({ id: editingProduct.id, ...formData });
        //     } else {
        //       createMutation.mutate(formData);
        //     }
        //   }}
        //   isLoading={createMutation.isPending || updateMutation.isPending}
        // />
        <ProductFormModal
          product={editingProduct}
          onClose={handleClose}
          onSubmit={async (formData) => {
            const res = editingProduct
              ? await updateMutation.mutateAsync({ id: editingProduct.id, ...formData })
              : await createMutation.mutateAsync(formData);
            return res.data; // the saved product (with id)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProductFormModal({ product, onClose, onSubmit, isLoading }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: product?.name || '',
    botanical_name: product?.botanical_name || '',
    description: product?.description || '',
    forms: product?.forms || '',
    price_min: product?.price_min || '',
    price_max: product?.price_max || '',
    unit: product?.unit || 'kg',
    tags: product?.tags || '',
    hsn_code: product?.hsn_code || '',
    is_active: product?.is_active ?? true,
  });

  const [files, setFiles] = useState([]);              // newly picked File objects
  const [previews, setPreviews] = useState([]);        // object URLs for picked files
  const [existing, setExisting] = useState(product?.images || []);
  const [uploading, setUploading] = useState(false);

  const [pickedAsset, setPickedAsset] = useState(null);
  const [imageUrlField, setImageUrlField] = useState('');

  const onPickFiles = (e) => {
    const picked = Array.from(e.target.files || []);
    setFiles(picked);
    setPreviews(picked.map((f) => URL.createObjectURL(f)));
  };

  const uploadImages = async (productId) => {
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append('images', f));
    await apiClient.post(`/admin/products/${productId}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  };

  const setPrimary = async (imageId) => {
    await apiClient.put(`/admin/products/${product.id}/images/${imageId}/primary`);
    setExisting((imgs) => imgs.map((i) => ({ ...i, is_primary: i.id === imageId })));
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  const deleteImage = async (imageId) => {
    await apiClient.delete(`/admin/products/${product.id}/images/${imageId}`);
    setExisting((imgs) => imgs.filter((i) => i.id !== imageId));
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setUploading(true);
      const saved = await onSubmit({
        ...form,
        price_min: form.price_min !== '' ? parseFloat(form.price_min) : null,
        price_max: form.price_max !== '' ? parseFloat(form.price_max) : null,
      });
      const productId = saved?.id || product?.id;
      if (productId) await uploadImages(productId);
      const linkUrl = pickedAsset || imageUrlField;
      if (productId && linkUrl) {
        await apiClient.post(`/admin/products/${productId}/images/link`, { url: linkUrl, alt_text: form.name });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || t('products.saveFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-display text-xl text-forest">
          {product ? t('products.editProduct') : t('products.newProduct')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('common.name')} *</label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.botanicalName')}</label>
            <Input value={form.botanical_name} onChange={e => setForm({ ...form, botanical_name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.description')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.forms')}</label>
            <Input placeholder={t('products.formsPlaceholder')} value={form.forms} onChange={e => setForm({ ...form, forms: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.unit')}</label>
            <select
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm"
            >
              {['kg', 'MT', 'ton', 'g', 'litre'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.hsnCode')}</label>
            <Input placeholder={t('products.hsnPlaceholder')} value={form.hsn_code} onChange={e => setForm({ ...form, hsn_code: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.priceMin')}</label>
            <Input type="number" placeholder={t('products.priceMinPlaceholder')} value={form.price_min} onChange={e => setForm({ ...form, price_min: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.priceMax')}</label>
            <Input type="number" value={form.price_max} onChange={e => setForm({ ...form, price_max: e.target.value })} />
          </div>

          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.tags')}</label>
            <Input
              placeholder={t('products.tagsPlaceholder')}
              value={form.tags}
              onChange={e => setForm({ ...form, tags: e.target.value })}
            />
            <p className="text-[11px] text-muted mt-1">
              {t('products.tagsHelp')}
            </p>
            {form.tags && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {form.is_active && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">{t('products.available')}</span>}
                {form.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-cream-dark text-forest-mid rounded-full">{t}</span>
                ))}
              </div>
            )}
          </div>
 
          {/* Images */}
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">{t('products.images')}</label>

            {existing.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {existing.map((img) => (
                  <div key={img.id} className="relative w-24">
                    <img
                      src={resolveImageUrl(img.url)}
                      alt={img.alt_text || ''}
                      className={`w-24 h-24 object-cover rounded border ${img.is_primary ? 'border-forest ring-2 ring-forest' : 'border-border'}`}
                    />
                    <div className="flex justify-between mt-1 text-[10px]">
                      <button type="button" onClick={() => setPrimary(img.id)} className="text-sage hover:text-forest">
                        {img.is_primary ? `★ ${t('products.primary')}` : t('products.setPrimary')}
                      </button>
                      <button type="button" onClick={() => deleteImage(img.id)} className="text-red-500">{t('common.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={onPickFiles}
              className="block w-full text-sm text-muted file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:bg-forest file:text-white file:text-sm hover:file:bg-forest-mid"
            />
            <p className="text-[11px] text-muted mt-1">{t('products.imagesHelp')}</p>
            {/* OR: pick from bundled asset gallery */}
            <p className="text-xs uppercase tracking-wide text-muted mt-4 mb-2">{t('products.orGallery')}</p>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto border border-border rounded-sm p-2">
              {ASSET_GALLERY.map((a) => (
                <button key={a.url} type="button" title={a.name}
                  onClick={() => setPickedAsset(pickedAsset === a.url ? null : a.url)}
                  className={`w-16 h-16 rounded overflow-hidden border-2 ${pickedAsset === a.url ? 'border-forest ring-2 ring-forest' : 'border-transparent'}`}>
                  <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* OR: external URL with live preview */}
            <p className="text-xs uppercase tracking-wide text-muted mt-4 mb-1">{t('products.orUrl')}</p>
            <Input type="url" placeholder="https://…" value={imageUrlField} onChange={e => setImageUrlField(e.target.value)} />
            {imageUrlField && (
              <img src={imageUrlField} alt="preview" className="w-24 h-24 object-cover rounded border border-dashed border-sage mt-2"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}

            {previews.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {previews.map((src, i) => (
                  <img key={i} src={src} alt="" className="w-24 h-24 object-cover rounded border border-dashed border-sage" />
                ))}
              </div>
            )}
          </div>

          <div className="col-span-2 flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.is_active}
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.is_active ? 'bg-forest' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 mt-0.5 rounded-full bg-white shadow transform transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm">
              {form.is_active
                ? t('products.activeToggleOn')
                : t('products.activeToggleOff')}
            </span>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" secondary onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" disabled={isLoading || uploading}>
            {(isLoading || uploading) ? t('common.saving') : t('products.saveProduct')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/*
function ProductFormModal({ product, onClose, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    name: product?.name || '',
    botanical_name: product?.botanical_name || '',
    description: product?.description || '',
    forms: product?.forms || '',
    price_min: product?.price_min || '',
    price_max: product?.price_max || '',
    unit: product?.unit || 'kg',
    is_active: product?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price_min: form.price_min !== '' ? parseFloat(form.price_min) : null,
      price_max: form.price_max !== '' ? parseFloat(form.price_max) : null,
    });
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="font-display text-xl text-forest">
          {product ? 'Edit Product' : 'New Product'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Name *</label>
            <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Botanical Name</label>
            <Input value={form.botanical_name} onChange={e => setForm({ ...form, botanical_name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Forms</label>
            <Input placeholder="e.g. Dried · Powder" value={form.forms} onChange={e => setForm({ ...form, forms: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Unit</label>
            <select
              value={form.unit}
              onChange={e => setForm({ ...form, unit: e.target.value })}
              className="w-full border border-border rounded-sm px-3 py-2 text-sm"
            >
              {['kg', 'MT', 'ton', 'g', 'litre'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Price Min (₹)</label>
            <Input type="number" placeholder={t('products.priceBlankHint')} value={form.price_min} onChange={e => setForm({ ...form, price_min: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-muted mb-1">Price Max (₹)</label>
            <Input type="number" value={form.price_max} onChange={e => setForm({ ...form, price_max: e.target.value })} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            <label htmlFor="active" className="text-sm">Active / visible on site</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" secondary onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Product'}</Button>
        </div>
      </form>
    </Modal>
  );
}
*/