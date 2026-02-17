'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { API_URL } from '@/lib/constants';

interface Setting {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  label: string;
  description: string;
  category: string;
}

interface EditedValues {
  [key: string]: string | number | boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  payouts: 'Paiements',
  cashback: 'Cashback',
  general: 'General',
  limits: 'Limites',
};

const CATEGORY_ORDER = ['general', 'payouts', 'cashback', 'limits'];

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)buyla_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return typeof window !== 'undefined' ? localStorage.getItem('buyla_token') : null;
}

async function fetchAdmin(path: string, options?: RequestInit) {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSettingValue(setting: Setting): string | number | boolean {
  switch (setting.type) {
    case 'boolean':
      return setting.value === 'true' || setting.value === '1';
    case 'number':
      return parseFloat(setting.value) || 0;
    default:
      return setting.value;
  }
}

function formatDisplayValue(setting: Setting): string {
  switch (setting.type) {
    case 'boolean':
      return setting.value === 'true' || setting.value === '1' ? 'Oui' : 'Non';
    case 'number':
      return setting.value;
    case 'json':
      try {
        return JSON.stringify(JSON.parse(setting.value), null, 2);
      } catch {
        return setting.value;
      }
    default:
      return setting.value;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminParamètresPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editedValues, setEditedValues] = useState<EditedValues>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [savingAll, setSavingAll] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const json = await fetchAdmin('/api/admin/settings');
      const result = json.data ?? json;
      const list = Array.isArray(result) ? result : result.settings ?? [];
      setSettings(list);
    } catch {
      setError('Erreur lors du chargement des parametres');
      setSettings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Group settings by category
  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    const cat = s.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  // Sort categories
  const sortedCategories = CATEGORY_ORDER.filter((c) => grouped[c]);
  // Add any extra categories not in order
  Object.keys(grouped).forEach((c) => {
    if (!sortedCategories.includes(c)) sortedCategories.push(c);
  });

  // Get current value (edited or original)
  function getCurrentValue(setting: Setting): string | number | boolean {
    if (setting.key in editedValues) return editedValues[setting.key];
    return parseSettingValue(setting);
  }

  // Check if setting has been modified
  function isModified(setting: Setting): boolean {
    if (!(setting.key in editedValues)) return false;
    const original = parseSettingValue(setting);
    return editedValues[setting.key] !== original;
  }

  // Update edited value
  function updateValue(key: string, value: string | number | boolean) {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
    // Clear saved state
    setSavedKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  // Save a single setting
  const saveSetting = useCallback(
    async (setting: Setting) => {
      // Inline check: is this setting actually modified?
      if (!(setting.key in editedValues)) return;
      const original = parseSettingValue(setting);
      if (editedValues[setting.key] === original) return;

      setSavingKeys((prev) => new Set(prev).add(setting.key));
      try {
        const value = editedValues[setting.key];
        const stringValue = typeof value === 'boolean' ? String(value) : String(value);
        await fetchAdmin(`/api/admin/settings/${setting.key}`, {
          method: 'PUT',
          body: JSON.stringify({ value: stringValue }),
        });
        // Update local state
        setSettings((prev) =>
          prev.map((s) => (s.key === setting.key ? { ...s, value: stringValue } : s)),
        );
        // Remove from edited
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next[setting.key];
          return next;
        });
        // Mark as saved
        setSavedKeys((prev) => new Set(prev).add(setting.key));
        setTimeout(() => {
          setSavedKeys((prev) => {
            const next = new Set(prev);
            next.delete(setting.key);
            return next;
          });
        }, 2000);
      } catch {
        // keep edited state
      } finally {
        setSavingKeys((prev) => {
          const next = new Set(prev);
          next.delete(setting.key);
          return next;
        });
      }
    },
    [editedValues],
  );

  // Save all modified settings
  const saveAll = useCallback(async () => {
    const modified = settings.filter((s) => {
      if (!(s.key in editedValues)) return false;
      const original = parseSettingValue(s);
      return editedValues[s.key] !== original;
    });
    if (modified.length === 0) return;
    setSavingAll(true);
    for (const setting of modified) {
      await saveSetting(setting);
    }
    setSavingAll(false);
  }, [settings, editedValues, saveSetting]);

  // Count modified
  const modifiedCount = settings.filter((s) => isModified(s)).length;

  // Render value editor
  function renderEditor(setting: Setting) {
    const value = getCurrentValue(setting);
    const isSaving = savingKeys.has(setting.key);
    const isSaved = savedKeys.has(setting.key);
    const modified = isModified(setting);

    switch (setting.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Toggle
              checked={Boolean(value)}
              onChange={(checked) => updateValue(setting.key, checked)}
              disabled={isSaving}
            />
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {isSaved && <Check className="h-4 w-4 text-green-500" />}
            {modified && !isSaving && !isSaved && (
              <button
                onClick={() => saveSetting(setting)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Sauvegarder
              </button>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={String(value)}
              onChange={(e) => updateValue(setting.key, parseFloat(e.target.value) || 0)}
              disabled={isSaving}
              className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {isSaved && <Check className="h-4 w-4 text-green-500" />}
            {modified && !isSaving && !isSaved && (
              <button
                onClick={() => saveSetting(setting)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Sauvegarder
              </button>
            )}
          </div>
        );

      case 'json':
        return (
          <div className="space-y-2">
            <textarea
              value={typeof value === 'string' ? value : formatDisplayValue(setting)}
              onChange={(e) => updateValue(setting.key, e.target.value)}
              disabled={isSaving}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
              {isSaved && <Check className="h-4 w-4 text-green-500" />}
              {modified && !isSaving && !isSaved && (
                <button
                  onClick={() => saveSetting(setting)}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Sauvegarder
                </button>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={String(value)}
              onChange={(e) => updateValue(setting.key, e.target.value)}
              disabled={isSaving}
              className="w-64 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {isSaved && <Check className="h-4 w-4 text-green-500" />}
            {modified && !isSaving && !isSaved && (
              <button
                onClick={() => saveSetting(setting)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Sauvegarder
              </button>
            )}
          </div>
        );
    }
  }

  // Loading state
  if (loading) {
    return (
      <div>
        <PageHeader title="Paramètres" description="Configurez les paramètres de la plateforme" />
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-32 rounded bg-gray-200" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-4 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && settings.length === 0) {
    return (
      <div>
        <PageHeader title="Paramètres" description="Configurez les paramètres de la plateforme" />
        <div className="mt-6">
          <Card>
            <div className="py-8 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="secondary" size="sm" className="mt-4" onClick={fetchSettings}>
                Réessayer
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Paramètres"
        description="Configurez les paramètres de la plateforme"
        actions={
          modifiedCount > 0 ? (
            <Button size="sm" loading={savingAll} onClick={saveAll}>
              <Save className="h-4 w-4" />
              Tout sauvegarder ({modifiedCount})
            </Button>
          ) : undefined
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {sortedCategories.map((category) => (
          <Card key={category}>
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              {CATEGORY_LABELS[category] || category.charAt(0).toUpperCase() + category.slice(1)}
            </h3>
            <div className="divide-y divide-gray-100">
              {grouped[category].map((setting) => (
                <div key={setting.key} className="py-4 first:pt-0 last:pb-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{setting.label || setting.key}</span>
                    {isModified(setting) && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        Modifie
                      </span>
                    )}
                  </div>
                  {setting.description && (
                    <p className="mb-2 text-xs text-gray-500">{setting.description}</p>
                  )}
                  {renderEditor(setting)}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
