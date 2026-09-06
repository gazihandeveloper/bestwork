'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Search, X, Square, CheckSquare, ImageIcon } from '@/lib/google-icons'
import { get, post, put, del } from '@/lib/api'
import toast from 'react-hot-toast'

interface Category {
  id: string; name: string; slug: string; image?: string; productCount?: number; isActive?: boolean; parent_id?: string
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', parent_id: '' })
  const [saving, setSaving] = useState(false)
  const [image, setImage] = useState<string>('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const res = await get<Category[]>('/admin/categories')
      if (res.success) setCategories(res.data || [])
    } catch { }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const toggleSelect = (id: string) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(c => c.id)))

  const openNew = () => { setEditing(null); setForm({ name: '', slug: '', parent_id: '' }); setImage(''); setModalOpen(true) }
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, slug: c.slug, parent_id: c.parent_id || '' }); setImage(c.image || ''); setModalOpen(true) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) { toast.error('Ad zorunlu'); return }
    setSaving(true)
    try {
      const payload: any = { ...form }
      if (image) payload.image_data = image
      const res = editing ? await put(`/admin/categories/${editing.id}`, payload) : await post('/admin/categories', payload)
      if (res.success) { toast.success(editing ? 'Güncellendi' : 'Eklendi'); setModalOpen(false); load() }
    } catch { toast.error('Hata') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Silinsin mi?')) return
    try { await del(`/admin/categories/${id}`); toast.success('Silindi'); load(); setSelected(new Set()) }
    catch { toast.error('Hata') }
  }

  const handleBulkDelete = async () => {
    if (!selected.size) return
    if (!confirm(`${selected.size} kategori silinsin mi?`)) return
    try {
      await post('/admin/categories/bulk-delete', { ids: Array.from(selected) })
      toast.success('Silindi'); load(); setSelected(new Set())
    } catch { toast.error('Hata') }
  }

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Kategoriler</h1><p className="text-sm text-gray-500">{categories.length} kategori</p></div>
        <div className="flex items-center gap-3">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"><Trash2 size={16} /> {selected.size} sil</button>
          )}
          <button onClick={openNew} className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-brand-600"><Plus size={16} /> Yeni</button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Ara..." value={search} onChange={e => setSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-brand-500" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50 text-left">
            <th className="px-4 py-3 w-10"><button onClick={toggleAll} className="text-gray-400 hover:text-brand-500">{selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}</button></th>
            <th className="px-4 py-3 font-semibold text-gray-600">Kategori</th><th className="px-4 py-3 font-semibold text-gray-600">Slug</th><th className="px-4 py-3 font-semibold text-gray-600">İşlem</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4} className="py-12 text-center text-gray-400">Yükleniyor...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={4} className="py-12 text-center text-gray-400">Kategori yok</td></tr>
            : filtered.map(c => (
              <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 ${selected.has(c.id) ? 'bg-brand-50' : ''}`}>
                <td className="px-4 py-3"><button onClick={() => toggleSelect(c.id)} className="text-gray-400 hover:text-brand-500">{selected.has(c.id) ? <CheckSquare size={16} className="text-brand-500" /> : <Square size={16} />}</button></td>
                <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                <td className="px-4 py-3 text-gray-500">{c.slug}</td>
                <td className="px-4 py-3"><div className="flex items-center gap-2">
                  <button onClick={() => openEdit(c)} className="p-1 text-gray-400 hover:text-brand-500"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 z-[201]">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{editing ? 'Düzenle' : 'Yeni Kategori'}</h3><button onClick={() => setModalOpen(false)}><X size={18} /></button></div>
            <form onSubmit={handleSave} className="space-y-3">
              {/* Görsel */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer" onClick={() => fileRef.current?.click()}>
                  {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={24} className="text-gray-300" />}
                </div>
                <div>
                  <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-brand-500 hover:underline">Görsel Yükle</button>
                  <p className="text-[10px] text-gray-400">Max 1MB, kare görsel</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const f = e.target.files?.[0]; if (!f) return
                  const r = new FileReader(); r.onload = () => setImage(r.result as string); r.readAsDataURL(f)
                }} />
              </div>
              <div><label className="text-xs font-medium text-gray-600">Ad</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-10 px-3 text-sm border rounded-lg focus:outline-none focus:border-brand-500" required /></div>
              <div><label className="text-xs font-medium text-gray-600">Slug</label><input value={form.slug} onChange={e => setForm({...form, slug: e.target.value})} className="w-full h-10 px-3 text-sm border rounded-lg focus:outline-none focus:border-brand-500" /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 h-10 text-sm bg-gray-100 rounded-lg">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 h-10 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600">{saving ? '...' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
