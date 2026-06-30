import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Scissors, Search, ToggleLeft, ToggleRight, Upload, X } from 'lucide-react';
import { fetchApi } from '../lib/apiClient';
import type { Fabric, FabricCategory } from '../types';
import { UNIT_OPTIONS } from '../types';
import Modal from '../components/Modal';

type FabricForm = Omit<Fabric, 'id' | 'created_at' | 'updated_at' | 'fabric_category_id' | 'fabric_category_name' | 'fabric_name'> & {
  fabric_category_id?: string;
  fabric_category_name?: string;
  fabric_name?: string;
};

const emptyForm: FabricForm = {
  fabric_name: '',
  color_name: '',
  color_code: '',
  image_url: '',
  unit: 'yard',
  yards_per_unit: 1,
  price_modifier: 0,
  in_stock: true,
  stock_level: null,
  is_active: true,
  fabric_category_id: '',
  fabric_category_name: '',
};

interface FabricPropertyInput {
  colorName: string;
  colorCode: string;
  imageUrl: string;
  unit: 'yard' | 'trouser-length' | 'ft' | 'roll' | 'pack';
  yardsPerUnit: number;
  priceModifier: number;
  inStock: boolean;
  stockLevel: number | null;
  isActive: boolean;
  uploading?: boolean;
}

interface FabricCreateForm {
  name: string;
  description: string;
  categoryId: string;
  properties: FabricPropertyInput[];
}

const defaultProperty = (): FabricPropertyInput => ({
  colorName: '',
  colorCode: '',
  imageUrl: '',
  unit: 'yard',
  yardsPerUnit: 1,
  priceModifier: 0,
  inStock: true,
  stockLevel: null,
  isActive: true,
});

const defaultCreateForm = (): FabricCreateForm => ({
  name: '',
  description: '',
  categoryId: '',
  properties: [defaultProperty()],
});

export default function Fabrics() {
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [categories, setCategories] = useState<FabricCategory[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [createCatModal, setCreateCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatError, setNewCatError] = useState('');
  const [newCatSaving, setNewCatSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Fabric | null>(null);
  
  // Create mode uses nested properties array structure
  const [createForm, setCreateForm] = useState<FabricCreateForm>(defaultCreateForm());
  // Edit mode targets individual flat variant fields mapped to parent arrays
  const [form, setForm] = useState<FabricForm>(emptyForm);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [res, catsRes] = await Promise.all([
        fetchApi('/v1/fabrics'),
        fetchApi('/v1/fabric-categories')
      ]);
      setCategories(catsRes || []);
      const flat: Fabric[] = [];
      (res || []).forEach((f: any) => {
        (f.properties || []).forEach((p: any, idx: number) => {
          flat.push({
            id: `${f._id}::${idx}`,
            fabric_name: f.name,
            color_name: p.colorName,
            color_code: p.colorCode || null,
            image_url: p.imageUrl,
            unit: p.unit,
            yards_per_unit: p.yardsPerUnit,
            price_modifier: p.priceModifier,
            in_stock: p.inStock,
            stock_level: p.stockLevel !== undefined ? p.stockLevel : null,
            is_active: p.isActive,
            fabric_category_id: f.category?._id || f.category || '',
            fabric_category_name: f.category?.name || '',
            created_at: f.createdAt || new Date().toISOString(),
            updated_at: f.updatedAt || new Date().toISOString(),
          } as any);
        });
      });
      setFabrics(flat);
    } catch (err) {
      console.error('Failed to load fabrics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setCreateForm(defaultCreateForm());
    setEditing(null);
    setError('');
    setModal('create');
  }

  function openEdit(f: Fabric) {
    setEditing(f);
    setForm({
      fabric_name: f.fabric_name || '',
      color_name: f.color_name,
      color_code: f.color_code || '',
      image_url: f.image_url,
      unit: f.unit,
      yards_per_unit: f.yards_per_unit,
      price_modifier: f.price_modifier,
      in_stock: f.in_stock,
      stock_level: f.stock_level,
      is_active: f.is_active,
      fabric_category_id: f.fabric_category_id || '',
      fabric_category_name: f.fabric_category_name || '',
    });
    setError('');
    setModal('edit');
  }

  function setField<K extends keyof FabricForm>(key: K, val: FabricForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function updateCreateField<K extends keyof FabricCreateForm>(key: K, val: FabricCreateForm[K]) {
    setCreateForm(prev => ({ ...prev, [key]: val }));
  }

  function updatePropertyField<K extends keyof FabricPropertyInput>(idx: number, key: K, val: FabricPropertyInput[K]) {
    setCreateForm(prev => {
      const copy = [...prev.properties];
      copy[idx] = { ...copy[idx], [key]: val };
      return { ...prev, properties: copy };
    });
  }

  function addProperty() {
    setCreateForm(prev => ({
      ...prev,
      properties: [...prev.properties, defaultProperty()],
    }));
  }

  function removeProperty(idx: number) {
    setCreateForm(prev => {
      if (prev.properties.length <= 1) return prev;
      const copy = prev.properties.filter((_, i) => i !== idx);
      return { ...prev, properties: copy };
    });
  }

  function extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
      const parts = url.split('/image/upload/');
      if (parts.length < 2) return null;
      let path = parts[1];
      const versionMatch = path.match(/^v\d+\//);
      if (versionMatch) {
        path = path.replace(/^v\d+\//, '');
      }
      const lastDot = path.lastIndexOf('.');
      if (lastDot !== -1) {
        path = path.substring(0, lastDot);
      }
      return path;
    } catch (err) {
      console.error('Failed to extract publicId:', err);
      return null;
    }
  }

  async function deleteImage(imageUrl: string) {
    const publicId = extractPublicId(imageUrl);
    if (!publicId) return;

    try {
      await fetchApi('/v1/admin/uploads', {
        method: 'DELETE',
        body: JSON.stringify({ publicId }),
      });
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err);
    }
  }

  // File upload for editing single variant
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const oldUrl = form.image_url;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchApi('/v1/admin/uploads', {
        method: 'POST',
        body: formData,
      });

      if (res?.url) {
        setField('image_url', res.url);
        if (oldUrl) {
          deleteImage(oldUrl);
        }
      } else {
        throw new Error('Upload succeeded but no image URL was returned.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  }

  // File upload for creating nested variant
  async function handleCreatePropertyFileUpload(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const oldUrl = createForm.properties[idx]?.imageUrl;

    setCreateForm(prev => {
      const copy = [...prev.properties];
      copy[idx] = { ...copy[idx], uploading: true };
      return { ...prev, properties: copy };
    });
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchApi('/v1/admin/uploads', {
        method: 'POST',
        body: formData,
      });

      if (res?.url) {
        setCreateForm(prev => {
          const copy = [...prev.properties];
          copy[idx] = { ...copy[idx], imageUrl: res.url, uploading: false };
          return { ...prev, properties: copy };
        });
        if (oldUrl) {
          deleteImage(oldUrl);
        }
      } else {
        throw new Error('Upload succeeded but no image URL was returned.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image.');
      setCreateForm(prev => {
        const copy = [...prev.properties];
        copy[idx] = { ...copy[idx], uploading: false };
        return { ...prev, properties: copy };
      });
    }
  }

  async function handleSave() {
    setError('');

    try {
      if (modal === 'create') {
        if (!createForm.name.trim()) { setError('Fabric name is required'); return; }
        if (!createForm.categoryId) { setError('Fabric category is required'); return; }
        if (createForm.properties.length === 0) { setError('At least one property/variant is required'); return; }

        for (let i = 0; i < createForm.properties.length; i++) {
          const p = createForm.properties[i];
          if (!p.colorName.trim()) { setError(`Variant #${i + 1}: Color name is required`); return; }
          if (!p.imageUrl.trim()) { setError(`Variant #${i + 1}: Image file must be uploaded first`); return; }
          if (p.colorCode && !/^#[0-9A-Fa-f]{6}$/.test(p.colorCode)) {
            setError(`Variant #${i + 1}: Color code must be a valid hex e.g. #4169E1`);
            return;
          }
        }

        setSaving(true);
        const payload = {
          name: createForm.name.trim(),
          description: createForm.description.trim() || undefined,
          categoryId: createForm.categoryId,
          properties: createForm.properties.map(p => ({
            colorName: p.colorName.trim(),
            colorCode: p.colorCode || undefined,
            imageUrl: p.imageUrl.trim(),
            unit: p.unit,
            yardsPerUnit: Number(p.yardsPerUnit),
            priceModifier: Number(p.priceModifier),
            inStock: p.inStock,
            stockLevel: p.stockLevel !== null ? Number(p.stockLevel) : undefined,
            isActive: p.isActive,
          })),
        };

        await fetchApi('/v1/admin/fabrics', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (editing) {
        if (!form.color_name.trim()) { setError('Color name is required'); return; }
        if (!form.fabric_category_id) { setError('Fabric category is required'); return; }
        if (!form.image_url.trim()) { setError('Image file must be uploaded first'); return; }
        if (form.color_code && !/^#[0-9A-Fa-f]{6}$/.test(form.color_code)) {
          setError('Color code must be a valid hex e.g. #4169E1');
          return;
        }

        setSaving(true);
        const [fabricId, propIndexStr] = editing.id.split('::');
        const propIdx = parseInt(propIndexStr, 10);

        const parentDoc = await fetchApi(`/v1/fabrics/${fabricId}`);
        const updatedProperties = [...(parentDoc.properties || [])];

        const newProp = {
          colorName: form.color_name.trim(),
          colorCode: form.color_code || undefined,
          imageUrl: form.image_url.trim(),
          unit: form.unit,
          yardsPerUnit: Number(form.yards_per_unit),
          priceModifier: Number(form.price_modifier),
          inStock: form.in_stock,
          stockLevel: form.stock_level !== null ? Number(form.stock_level) : undefined,
          isActive: form.is_active,
        };

        updatedProperties[propIdx] = newProp;

        const payload = {
          name: form.fabric_name?.trim() || parentDoc.name,
          categoryId: form.fabric_category_id,
          properties: updatedProperties,
        };

        await fetchApi(`/v1/admin/fabrics/${fabricId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      setModal(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to save fabric');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const [fabricId, propIndexStr] = deleteId.split('::');
      const propIdx = parseInt(propIndexStr, 10);

      const parentDoc = await fetchApi(`/v1/fabrics/${fabricId}`);
      const updatedProperties = (parentDoc.properties || []).filter((_: any, idx: number) => idx !== propIdx);

      if (updatedProperties.length === 0) {
        await fetchApi(`/v1/admin/fabrics/${fabricId}`, {
          method: 'DELETE',
        });
      } else {
        await fetchApi(`/v1/admin/fabrics/${fabricId}`, {
          method: 'PUT',
          body: JSON.stringify({ properties: updatedProperties }),
        });
      }

      setDeleteId(null);
      load();
    } catch (err) {
      console.error('Failed to delete fabric:', err);
    }
  }

  async function toggleActive(f: Fabric) {
    try {
      const [fabricId, propIndexStr] = f.id.split('::');
      const propIdx = parseInt(propIndexStr, 10);

      const parentDoc = await fetchApi(`/v1/fabrics/${fabricId}`);
      const updatedProperties = [...(parentDoc.properties || [])];

      updatedProperties[propIdx] = {
        ...updatedProperties[propIdx],
        isActive: !f.is_active,
      };

      await fetchApi(`/v1/admin/fabrics/${fabricId}`, {
        method: 'PUT',
        body: JSON.stringify({ properties: updatedProperties }),
      });
      load();
    } catch (err) {
      console.error('Failed to toggle active status:', err);
    }
  }

  const filtered = fabrics.filter(f => {
    const matchSearch =
      (f.fabric_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (f.color_name || '').toLowerCase().includes(search.toLowerCase());
    const matchCategory = !selectedCategoryFilter || f.fabric_category_id === selectedCategoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1C1916]" style={{ fontFamily: "'Georgia', serif" }}>Fabrics</h2>
          <p className="text-sm text-[#6B6460] mt-0.5">{fabrics.length} total · {fabrics.filter(f => f.is_active).length} active</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#C8521A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#b04817] transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          New Fabric
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F87]" />
          <input
            type="text"
            placeholder="Search fabrics…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5DFD5] rounded-xl text-sm text-[#1C1916] placeholder-[#9A8F87] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]"
          />
        </div>
        <select
          value={selectedCategoryFilter}
          onChange={e => setSelectedCategoryFilter(e.target.value)}
          className="border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-white text-[#1C1916] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] w-full sm:w-48"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#9A8F87]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Scissors size={32} className="text-[#E5DFD5] mx-auto mb-3" />
            <p className="text-sm text-[#9A8F87]">No fabrics found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-[#E5DFD5] bg-[#FAF8F5]">
                  <th className="sticky left-0 bg-[#FAF8F5] z-10 text-left text-xs font-semibold text-[#6B6460] px-5 py-3 border-r border-[#E5DFD5]">Fabric</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Unit</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Price Modifier</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Stock</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => (
                  <tr key={f.id} className="group border-b border-[#F7F3EC] last:border-0 hover:bg-[#FAF8F5] transition-colors">
                    <td className="sticky left-0 bg-white z-10 group-hover:bg-[#FAF8F5] transition-colors px-5 py-4 border-r border-[#E5DFD5]">
                      <div className="flex items-center gap-3">
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#E5DFD5] flex-shrink-0 bg-[#F7F3EC]">
                          <img src={f.image_url} alt={f.color_name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          {f.color_code && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-tl-md border-t border-l border-[#E5DFD5]" style={{ backgroundColor: f.color_code }} />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#1C1916]">{f.fabric_name}</p>
                          <p className="text-xs text-[#9A8F87]">{f.color_name} {f.color_code ? `(${f.color_code})` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#1C1916]">
                      <span className="text-xs bg-[#F7F3EC] text-[#6B6460] px-2 py-1 rounded-md font-medium">
                        {f.fabric_category_name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-[#F7F3EC] text-[#6B6460] px-2 py-1 rounded-md">{f.unit}</span>
                      <p className="text-xs text-[#9A8F87] mt-0.5">{f.yards_per_unit} per unit</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-[#1C1916]">
                      {f.price_modifier > 0 ? `+₦${f.price_modifier.toLocaleString()}` : '₦0'}
                    </td>
                    <td className="px-5 py-4">
                      {f.stock_level !== null ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.stock_level < 10 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                          {f.stock_level} {f.unit}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9A8F87]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <button onClick={() => toggleActive(f)} className="flex items-center gap-1.5 text-xs font-medium transition-colors">
                        {f.is_active ? (
                          <><ToggleRight size={18} className="text-[#C8521A]" /><span className="text-[#C8521A]">Active</span></>
                        ) : (
                          <><ToggleLeft size={18} className="text-[#9A8F87]" /><span className="text-[#9A8F87]">Inactive</span></>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEdit(f)} className="p-1.5 rounded-lg text-[#6B6460] hover:bg-[#F7F3EC] hover:text-[#C8521A] transition-colors"><Pencil size={15} /></button>
                        <button onClick={() => setDeleteId(f.id)} className="p-1.5 rounded-lg text-[#6B6460] hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal === 'create' && (
        <Modal title="New Fabric" onClose={() => setModal(null)} size="lg">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5 font-bold">Fabric Name <span className="text-[#C8521A]">*</span></label>
                <input type="text" value={createForm.name} onChange={e => updateCreateField('name', e.target.value)} placeholder="e.g. Premium Silk Aso-oke" className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5 font-bold">Fabric Category <span className="text-[#C8521A]">*</span></label>
                <div className="flex gap-2">
                  <select
                    value={createForm.categoryId}
                    onChange={e => updateCreateField('categoryId', e.target.value)}
                    className="flex-1 border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]"
                  >
                    <option value="">Select a category</option>
                    {categories.map(c => (
                      <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCreateCatModal(true)}
                    className="border border-[#E5DFD5] hover:border-[#C8521A] text-[#1C1916] rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors shrink-0"
                  >
                    New Category
                  </button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Fabric Description</label>
                <textarea value={createForm.description} onChange={e => updateCreateField('description', e.target.value)} rows={3} placeholder="Describe the quality, touch and weaving origin…" className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] resize-none" />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5DFD5] pb-2">
                <span className="text-sm font-bold text-[#1C1916]">Properties & Variants</span>
                <button type="button" onClick={addProperty} className="flex items-center gap-1 text-xs font-semibold text-[#C8521A] hover:underline">
                  <Plus size={14} /> Add Variant
                </button>
              </div>

              {createForm.properties.map((p, idx) => (
                <div key={idx} className="border border-[#E5DFD5] rounded-2xl p-5 space-y-4 bg-[#FAF8F5] relative">
                  {createForm.properties.length > 1 && (
                    <button type="button" onClick={() => removeProperty(idx)} className="absolute top-3 right-3 p-1.5 rounded-lg text-[#9A8F87] hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                  <p className="text-xs font-bold text-[#6B6460] uppercase tracking-wider">Variant #{idx + 1}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Color Name <span className="text-[#C8521A]">*</span></label>
                      <input type="text" value={p.colorName} onChange={e => updatePropertyField(idx, 'colorName', e.target.value)} placeholder="e.g. Royal Blue" className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Color Code</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={p.colorCode || '#ffffff'}
                          onChange={e => updatePropertyField(idx, 'colorCode', e.target.value)}
                          className="w-10 h-10 rounded-lg border border-[#E5DFD5] cursor-pointer p-0.5 bg-white"
                        />
                        <input type="text" value={p.colorCode} onChange={e => updatePropertyField(idx, 'colorCode', e.target.value)} placeholder="#4169E1" className="flex-1 bg-white border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Fabric Image <span className="text-[#C8521A]">*</span> <span className="text-[#9A8F87] font-normal">(must upload first)</span></label>
                      <div className="flex flex-col gap-3">
                        {p.imageUrl && (
                          <div className="relative w-28 h-28 rounded-xl border border-[#E5DFD5] overflow-hidden bg-[#F7F3EC] group shrink-0">
                            <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={async () => {
                                const url = p.imageUrl;
                                updatePropertyField(idx, 'imageUrl', '');
                                if (url) {
                                  await deleteImage(url);
                                }
                              }}
                              className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={p.imageUrl}
                            readOnly
                            placeholder="Upload file to generate URL…"
                            className="flex-1 border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-[#FAF8F5] text-[#6B6460] cursor-not-allowed focus:outline-none"
                          />
                          <label className="bg-white border border-[#E5DFD5] hover:border-[#C8521A] text-[#1C1916] rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 select-none">
                            {p.uploading ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8521A] border-t-transparent"></div>
                                <span>Uploading…</span>
                              </>
                            ) : (
                              <>
                                <Upload size={16} className="text-[#C8521A]" />
                                <span>Upload File</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={e => handleCreatePropertyFileUpload(idx, e)}
                              className="hidden"
                              disabled={p.uploading}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Unit <span className="text-[#C8521A]">*</span></label>
                      <select value={p.unit} onChange={e => updatePropertyField(idx, 'unit', e.target.value as Fabric['unit'])} className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]">
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                             <div>
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Yards Per Unit</label>
                      <input type="number" min="0.1" step="0.1" value={p.yardsPerUnit} onChange={e => updatePropertyField(idx, 'yardsPerUnit', Number(e.target.value))} onFocus={e => e.target.select()} className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Price Modifier (₦)</label>
                      <input type="number" min="0" value={p.priceModifier} onChange={e => updatePropertyField(idx, 'priceModifier', Number(e.target.value))} onFocus={e => e.target.select()} className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Stock Level</label>
                      <input type="number" min="0" value={p.stockLevel ?? ''} onChange={e => updatePropertyField(idx, 'stockLevel', e.target.value === '' ? null : Number(e.target.value))} onFocus={e => e.target.select()} placeholder="Leave blank if not tracked" className="w-full bg-white border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
                    </div>               </div>

                    <div className="flex gap-4 sm:col-span-2 pt-2">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="checkbox" checked={p.inStock} onChange={e => updatePropertyField(idx, 'inStock', e.target.checked)} className="w-4 h-4 accent-[#C8521A]" />
                        <span className="text-sm text-[#1C1916]">In Stock</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input type="checkbox" checked={p.isActive} onChange={e => updatePropertyField(idx, 'isActive', e.target.checked)} className="w-4 h-4 accent-[#C8521A]" />
                        <span className="text-sm text-[#1C1916]">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 mt-4 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setModal(null)} className="flex-1 border border-[#E5DFD5] text-[#6B6460] rounded-xl py-2.5 text-sm font-medium hover:bg-[#F7F3EC] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#C8521A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#b04817] transition-colors disabled:opacity-60">
              {saving ? 'Creating…' : 'Create Fabric'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'edit' && (
        <Modal title="Edit Fabric" onClose={() => setModal(null)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5 font-bold">Fabric Category <span className="text-[#C8521A]">*</span></label>
              <select
                value={form.fabric_category_id}
                onChange={e => setField('fabric_category_id', e.target.value)}
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]"
              >
                <option value="">Select a category</option>
                {categories.map(c => (
                  <option key={c.id || (c as any)._id} value={c.id || (c as any)._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Fabric Name <span className="text-[#C8521A]">*</span></label>
              <input type="text" value={form.fabric_name} onChange={e => setField('fabric_name', e.target.value)} placeholder="e.g. Standard Aso-oke" className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Color Name <span className="text-[#C8521A]">*</span></label>
              <input type="text" value={form.color_name} onChange={e => setField('color_name', e.target.value)} placeholder="e.g. Royal Blue" className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Color Code</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.color_code || '#ffffff'}
                  onChange={e => setField('color_code', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-[#E5DFD5] cursor-pointer p-0.5 bg-white"
                />
                <input type="text" value={form.color_code || ''} onChange={e => setField('color_code', e.target.value)} placeholder="#4169E1" className="flex-1 border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Unit <span className="text-[#C8521A]">*</span></label>
              <select value={form.unit} onChange={e => setField('unit', e.target.value as Fabric['unit'])} className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]">
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Fabric Image <span className="text-[#C8521A]">*</span></label>
              <div className="flex flex-col gap-3">
                {form.image_url && (
                  <div className="relative w-28 h-28 rounded-xl border border-[#E5DFD5] overflow-hidden bg-[#F7F3EC] group shrink-0">
                    <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={async () => {
                        const url = form.image_url;
                        setField('image_url', '');
                        if (url) {
                          await deleteImage(url);
                        }
                      }}
                      className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.image_url}
                    readOnly
                    placeholder="Upload file to generate URL…"
                    className="flex-1 border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm bg-[#FAF8F5] text-[#6B6460] cursor-not-allowed focus:outline-none"
                  />
                  <label className="bg-[#FAF8F5] border border-[#E5DFD5] hover:border-[#C8521A] text-[#1C1916] rounded-xl px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 select-none">
                    {uploading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#C8521A] border-t-transparent"></div>
                        <span>Uploading…</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} className="text-[#C8521A]" />
                        <span>Upload File</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Yards Per Unit</label>
              <input type="number" min="0.1" step="0.1" value={form.yards_per_unit} onChange={e => setField('yards_per_unit', Number(e.target.value))} onFocus={e => e.target.select()} className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Price Modifier (₦)</label>
              <input type="number" min="0" value={form.price_modifier} onChange={e => setField('price_modifier', Number(e.target.value))} onFocus={e => e.target.select()} className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Stock Level</label>
              <input type="number" min="0" value={form.stock_level ?? ''} onChange={e => setField('stock_level', e.target.value === '' ? null : Number(e.target.value))} onFocus={e => e.target.select()} placeholder="Leave blank if not tracked" className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]" />
            </div>

            <div className="flex flex-col gap-3">
              <label className="block text-xs font-semibold text-[#1C1916]">Flags</label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={form.in_stock} onChange={e => setField('in_stock', e.target.checked)} className="w-4 h-4 accent-[#C8521A]" />
                <span className="text-sm text-[#1C1916]">In Stock</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={form.is_active} onChange={e => setField('is_active', e.target.checked)} className="w-4 h-4 accent-[#C8521A]" />
                <span className="text-sm text-[#1C1916]">Active</span>
              </label>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 mt-4 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button onClick={() => setModal(null)} className="flex-1 border border-[#E5DFD5] text-[#6B6460] rounded-xl py-2.5 text-sm font-medium hover:bg-[#F7F3EC] transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#C8521A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#b04817] transition-colors disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal title="Delete Fabric" onClose={() => setDeleteId(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-[#6B6460]">Are you sure you want to delete this fabric variant? This variant will be removed from the fabric's properties list.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-[#E5DFD5] text-[#6B6460] rounded-xl py-2.5 text-sm font-medium hover:bg-[#F7F3EC] transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </Modal>
      )}

      {createCatModal && (
        <Modal title="New Fabric Category" onClose={() => setCreateCatModal(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5 font-bold">Category Name <span className="text-[#C8521A]">*</span></label>
              <input
                type="text"
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="e.g. Linen"
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]"
              />
            </div>
            {newCatError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{newCatError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setCreateCatModal(false)}
                className="flex-1 border border-[#E5DFD5] text-[#6B6460] rounded-xl py-2.5 text-sm font-medium hover:bg-[#F7F3EC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newCatName.trim()) { setNewCatError('Category name is required'); return; }
                  setNewCatSaving(true);
                  setNewCatError('');
                  try {
                    const res = await fetchApi('/v1/admin/fabric-categories', {
                      method: 'POST',
                      body: JSON.stringify({ name: newCatName.trim() }),
                    });
                    if (res) {
                      const cats = await fetchApi('/v1/fabric-categories');
                      setCategories(cats || []);
                      if (modal === 'create') {
                        updateCreateField('categoryId', res.id || res._id);
                      } else {
                        setField('fabric_category_id', res.id || res._id);
                      }
                      setNewCatName('');
                      setCreateCatModal(false);
                    }
                  } catch (err: any) {
                    setNewCatError(err.message || 'Failed to create category');
                  } finally {
                    setNewCatSaving(false);
                  }
                }}
                disabled={newCatSaving}
                className="flex-1 bg-[#C8521A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#b04817] transition-colors disabled:opacity-60"
              >
                {newCatSaving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
