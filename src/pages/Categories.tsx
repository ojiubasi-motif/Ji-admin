import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Tag, Search } from 'lucide-react';
import { fetchApi } from '../lib/apiClient';
import type { Category } from '../types';
import Modal from '../components/Modal';

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

interface FormState { name: string; slug: string }
const empty: FormState = { name: '', slug: '' };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchApi('/v1/categories');
      const mapped = (res?.categories || []).map((c: any) => ({
        id: c.slug, // Map slug as id for compatibility
        name: c.name,
        slug: c.slug,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setCategories(mapped);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setForm(empty);
    setError('');
    setModal('create');
  }

  function openEdit(c: Category) {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug });
    setError('');
    setModal('edit');
  }

  function handleNameChange(name: string) {
    setForm(f => ({ ...f, name, slug: slugify(name) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.slug.trim()) { setError('Slug is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (modal === 'create') {
        await fetchApi('/v1/admin/categories', {
          method: 'POST',
          body: JSON.stringify({ name: form.name.trim(), slug: form.slug.trim() }),
        });
      } else if (editing) {
        await fetchApi(`/v1/admin/categories/${editing.id}`, {
          method: 'PUT',
          body: JSON.stringify({ name: form.name.trim() }),
        });
      }
      setModal(null);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetchApi(`/v1/admin/categories/${deleteId}`, {
        method: 'DELETE',
      });
      setDeleteId(null);
      load();
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  }

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#1C1916]" style={{ fontFamily: "'Georgia', serif" }}>
            Categories
          </h2>
          <p className="text-sm text-[#6B6460] mt-0.5">{categories.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#C8521A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#b04817] transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          New Category
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A8F87]" />
        <input
          type="text"
          placeholder="Search categories…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5DFD5] rounded-xl text-sm text-[#1C1916] placeholder-[#9A8F87] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#9A8F87]">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Tag size={32} className="text-[#E5DFD5] mx-auto mb-3" />
            <p className="text-sm text-[#9A8F87]">No categories found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-[#E5DFD5] bg-[#FAF8F5]">
                  <th className="sticky left-0 bg-[#FAF8F5] z-10 text-left text-xs font-semibold text-[#6B6460] px-5 py-3 border-r border-[#E5DFD5]">Name</th>
                  <th className="text-left text-xs font-semibold text-[#6B6460] px-5 py-3">Slug</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="group border-b border-[#F7F3EC] last:border-0 hover:bg-[#FAF8F5] transition-colors">
                    <td className="sticky left-0 bg-white z-10 group-hover:bg-[#FAF8F5] transition-colors px-5 py-4 border-r border-[#E5DFD5]">
                      <span className="text-sm font-medium text-[#1C1916]">{c.name}</span>
                    </td>
                    <td className="px-5 py-4">
                      <code className="text-xs bg-[#F7F3EC] text-[#6B6460] px-2 py-1 rounded-md">{c.slug}</code>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-[#6B6460] hover:bg-[#F7F3EC] hover:text-[#C8521A] transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteId(c.id)}
                          className="p-1.5 rounded-lg text-[#6B6460] hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'New Category' : 'Edit Category'}
          onClose={() => setModal(null)}
          size="sm"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Name <span className="text-[#C8521A]">*</span></label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Agbada, Ankara, Kaftan"
                className="w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm text-[#1C1916] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1C1916] mb-1.5">Slug <span className="text-[#C8521A]">*</span></label>
              <input
                type="text"
                value={form.slug}
                disabled={modal === 'edit'}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="e.g. agbada"
                className={`w-full border border-[#E5DFD5] rounded-xl px-4 py-2.5 text-sm text-[#6B6460] bg-[#FAF8F5] focus:outline-none focus:ring-2 focus:ring-[#C8521A]/30 focus:border-[#C8521A] ${modal === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 border border-[#E5DFD5] text-[#6B6460] rounded-xl py-2.5 text-sm font-medium hover:bg-[#F7F3EC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#C8521A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#b04817] transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : modal === 'create' ? 'Create' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Delete Category" onClose={() => setDeleteId(null)} size="sm">
          <p className="text-sm text-[#6B6460] mb-5">
            This will permanently remove the category. Products linked to it will lose this association.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 border border-[#E5DFD5] text-[#6B6460] rounded-xl py-2.5 text-sm font-medium hover:bg-[#F7F3EC] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
