import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, Button, Card, Field, PageHeader, inputClass } from "../components/ui";
import { PlusIcon, TrashIcon, EditIcon, DocumentIcon } from "../components/Icons";
import type { CertificateTrack, TrainingMaterial } from "../types";

const CATEGORIES: { id: CertificateTrack; label: string }[] = [
  { id: "private", label: "Private" },
  { id: "instrument", label: "Instrument" },
  { id: "commercial", label: "Commercial" },
  { id: "cfi", label: "CFI" },
];

const emptyForm = { title: "", description: "", url: "" };

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TrainingMaterials() {
  const { user } = useAuth();
  const canEdit = user?.role === "administrator" || user?.role === "instructor";

  const [category, setCategory] = useState<CertificateTrack>("private");
  const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [existingFileName, setExistingFileName] = useState<string | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    api.trainingMaterials
      .list()
      .then(setMaterials)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function resetFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setFile(null);
    setExistingFileName(null);
    setRemoveExistingFile(false);
    resetFileInput();
    setShowForm(true);
  }

  function startEdit(material: TrainingMaterial) {
    setEditingId(material.id);
    setForm({ title: material.title, description: material.description, url: material.url });
    setFile(null);
    setExistingFileName(material.fileName);
    setRemoveExistingFile(false);
    resetFileInput();
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editingId) {
        await api.trainingMaterials.update(editingId, { ...form }, file, removeExistingFile);
      } else {
        await api.trainingMaterials.create({ ...form, category }, file);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      setFile(null);
      resetFileInput();
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(material: TrainingMaterial) {
    if (!confirm(`Delete "${material.title}"? This cannot be undone.`)) return;
    setError(null);
    try {
      await api.trainingMaterials.remove(material.id);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function downloadFile(material: TrainingMaterial) {
    if (!material.fileName) return;
    try {
      await api.trainingMaterials.download(material.id, material.fileName);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const filtered = materials.filter((m) => m.category === category).sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div>
      <PageHeader
        title="Training Materials"
        subtitle="Reference material and study resources, organized by certificate track"
        actions={
          canEdit ? (
            <Button onClick={startAdd}>
              <PlusIcon width={16} height={16} /> Add Material
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-900 p-1 w-fit flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
              category === c.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {showForm && canEdit && (
        <Card className="p-5 mb-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Title">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Airplane Flying Handbook, Chapter 4"
                  required
                  autoFocus
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description (optional)">
                <input
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Link (optional)" hint="A URL to a document, video, or external resource">
                <input
                  type="url"
                  className={inputClass}
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="File (optional)" hint="Upload a PDF, document, or other file, up to 25 MB">
                {existingFileName && !removeExistingFile && !file && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <DocumentIcon width={16} height={16} />
                    <span className="truncate">{existingFileName}</span>
                    <button
                      type="button"
                      className="text-red-600 hover:underline text-xs shrink-0"
                      onClick={() => setRemoveExistingFile(true)}
                    >
                      Remove
                    </button>
                  </div>
                )}
                {removeExistingFile && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
                    <span>File will be removed on save.</span>
                    <button
                      type="button"
                      className="text-brand-600 hover:underline text-xs shrink-0"
                      onClick={() => setRemoveExistingFile(false)}
                    >
                      Undo
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:text-white file:px-3 file:py-1.5 file:text-sm file:font-medium`}
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </Field>
            </div>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {editingId ? "Save Changes" : "Add Material"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(emptyForm);
                  setFile(null);
                  resetFileInput();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading materials…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-slate-400">
          No {CATEGORIES.find((c) => c.id === category)?.label} materials yet.
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((material) => (
              <div key={material.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {material.url ? (
                      <a
                        href={material.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        {material.title}
                      </a>
                    ) : (
                      material.title
                    )}
                  </p>
                  {material.description && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{material.description}</p>
                  )}
                  {material.fileName && (
                    <button
                      onClick={() => downloadFile(material)}
                      className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline"
                    >
                      <DocumentIcon width={14} height={14} />
                      {material.fileName}
                      {material.fileSize != null && (
                        <span className="text-slate-400">({formatFileSize(material.fileSize)})</span>
                      )}
                    </button>
                  )}
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="p-1.5 rounded-md text-slate-400 hover:text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => startEdit(material)}
                      title="Edit"
                    >
                      <EditIcon width={16} height={16} />
                    </button>
                    <button
                      className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                      onClick={() => remove(material)}
                      title="Delete"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
