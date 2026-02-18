'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Link2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Trash2,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { apiFetch } from '@/lib/api-client';
const HISTORY_STORAGE_KEY = 'buyla_link_history';
const MAX_HISTORY = 20;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeneratedLink {
  id: string;
  originalUrl: string;
  generatedUrl: string;
  merchantName: string;
  cashbackRate: number | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------



function loadHistory(): GeneratedLink[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeneratedLink[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: GeneratedLink[]) {
  try {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY)),
    );
  } catch {
    // Quota exceeded — silently ignore
  }
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// QR Code canvas generator (no external dependency)
// ---------------------------------------------------------------------------

function drawQrPlaceholder(
  canvas: HTMLCanvasElement,
  text: string,
  size = 200,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = size;
  canvas.height = size;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Border
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);

  // Simple visual pattern based on URL hash
  const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const cellSize = 8;
  const margin = 20;
  const grid = Math.floor((size - margin * 2) / cellSize);

  ctx.fillStyle = '#1e1b4b';
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const seed = (hash * (row + 1) * (col + 1) + row * 7 + col * 13) % 100;
      if (seed < 40) {
        ctx.fillRect(
          margin + col * cellSize,
          margin + row * cellSize,
          cellSize - 1,
          cellSize - 1,
        );
      }
    }
  }

  // Corner markers (top-left, top-right, bottom-left)
  const markerSize = cellSize * 3;
  const drawMarker = (x: number, y: number) => {
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(x, y, markerSize, markerSize);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, cellSize, cellSize);
  };
  drawMarker(margin, margin);
  drawMarker(margin + (grid - 3) * cellSize, margin);
  drawMarker(margin, margin + (grid - 3) * cellSize);
}

// ---------------------------------------------------------------------------
// Social share URLs
// ---------------------------------------------------------------------------

function shareWhatsApp(url: string) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(url)}`,
    '_blank',
    'noopener',
  );
}

function shareTelegram(url: string) {
  window.open(
    `https://t.me/share/url?url=${encodeURIComponent(url)}`,
    '_blank',
    'noopener',
  );
}

function shareTwitter(url: string) {
  window.open(
    `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
    '_blank',
    'noopener',
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MesLiensPage() {
  const t = useTranslations('linkGenerator');

  // ---- State ----
  const [inputUrl, setInputUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [history, setHistory] = useState<GeneratedLink[]>([]);

  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Draw QR when shown
  useEffect(() => {
    if (showQr && qrCanvasRef.current && result) {
      drawQrPlaceholder(qrCanvasRef.current, result.generatedUrl);
    }
  }, [showQr, result]);

  // ---- Handlers ----

  const handleGenerate = useCallback(async () => {
    setError(null);
    setResult(null);
    setShowQr(false);
    setCopied(false);

    const trimmed = inputUrl.trim();
    if (!trimmed) return;

    if (!isValidUrl(trimmed)) {
      setError(t('errorInvalid'));
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch('/api/links/generate', {
        method: 'POST',
        body: JSON.stringify({ url: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 400 || res.status === 404) {
          setError(body?.message || t('errorUnsupported'));
        } else {
          setError(body?.message || t('errorUnsupported'));
        }
        return;
      }

      const json = await res.json();
      const data = json.data ?? json;

      const newLink: GeneratedLink = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        originalUrl: trimmed,
        generatedUrl: data.generated_url || data.generatedUrl || data.url || '',
        merchantName:
          data.merchant_name || data.merchantName || data.merchant || '',
        cashbackRate:
          data.cashback_rate ?? data.cashbackRate ?? data.rate ?? null,
        createdAt: new Date().toISOString(),
      };

      setResult(newLink);

      // Persist to history
      const updated = [newLink, ...history].slice(0, MAX_HISTORY);
      setHistory(updated);
      saveHistory(updated);
    } catch {
      setError(t('errorUnsupported'));
    } finally {
      setLoading(false);
    }
  }, [inputUrl, history, t]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = result.generatedUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleRemoveHistory = useCallback(
    (id: string) => {
      const updated = history.filter((item) => item.id !== id);
      setHistory(updated);
      saveHistory(updated);
    },
    [history],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleGenerate();
    }
  };

  // ---- Render ----

  return (
    <div>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {/* ── Input Section ── */}
      <Card className="mt-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="link-input"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="link-input"
                type="url"
                value={inputUrl}
                onChange={(e) => {
                  setInputUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t('inputPlaceholder')}
                className={
                  'w-full rounded-lg border bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 ' +
                  'transition-colors duration-150 ' +
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-transparent ' +
                  (error
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-gray-300 hover:border-gray-400')
                }
              />
            </div>
            {error && (
              <p className="mt-1.5 text-sm text-red-600">{error}</p>
            )}
          </div>
          <Button
            size="lg"
            loading={loading}
            disabled={!inputUrl.trim()}
            onClick={handleGenerate}
            className="shrink-0"
          >
            {loading ? t('generating') : t('generateButton')}
          </Button>
        </div>
      </Card>

      {/* ── Result Card ── */}
      {result && (
        <Card className="mt-6 border-primary-200 bg-gradient-to-br from-primary-50/50 to-accent-50/30">
          <div className="flex flex-col gap-4">
            {/* Header row */}
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('resultTitle')}
              </h3>
              {result.merchantName && (
                <Badge variant="default" size="sm">
                  {result.merchantName}
                </Badge>
              )}
              {result.cashbackRate != null && result.cashbackRate > 0 && (
                <Badge variant="primary" size="sm">
                  {t('cashbackBadge', { rate: String(result.cashbackRate) })}
                </Badge>
              )}
            </div>

            {/* Generated URL display */}
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="flex-1 truncate text-sm text-gray-700 select-all">
                {result.generatedUrl}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              {/* Copy */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? t('copied') : t('copyButton')}
              </Button>

              {/* QR Code */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowQr(!showQr)}
                className="gap-1.5"
              >
                <QrCode className="h-4 w-4" />
                {t('qrCode')}
              </Button>

              {/* Social sharing */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => shareWhatsApp(result.generatedUrl)}
                className="gap-1.5"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {t('shareWhatsApp')}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => shareTelegram(result.generatedUrl)}
                className="gap-1.5"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                {t('shareTelegram')}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => shareTwitter(result.generatedUrl)}
                className="gap-1.5"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                {t('shareTwitter')}
              </Button>
            </div>

            {/* QR Code display */}
            {showQr && (
              <div className="flex justify-center rounded-lg border border-gray-200 bg-white p-6">
                <canvas ref={qrCanvasRef} className="h-[200px] w-[200px]" />
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── History Section ── */}
      <div className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="h-5 w-5 text-gray-400" />
          {t('history')}
        </h2>

        {history.length === 0 ? (
          <EmptyState
            icon={<Link2 className="h-6 w-6" />}
            title={t('noHistory')}
            className="mt-4"
          />
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((item) => (
              <Card key={item.id} className="!p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Merchant + cashback */}
                    <div className="flex flex-wrap items-center gap-2">
                      {item.merchantName && (
                        <span className="text-sm font-medium text-gray-900">
                          {item.merchantName}
                        </span>
                      )}
                      {item.cashbackRate != null &&
                        item.cashbackRate > 0 && (
                          <Badge variant="primary" size="sm">
                            {t('cashbackBadge', {
                              rate: String(item.cashbackRate),
                            })}
                          </Badge>
                        )}
                    </div>

                    {/* Generated URL */}
                    <p className="mt-1 truncate text-sm text-primary-600">
                      {item.generatedUrl}
                    </p>

                    {/* Original URL */}
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      {item.originalUrl}
                    </p>

                    {/* Date */}
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            item.generatedUrl,
                          );
                        } catch {
                          // Ignore
                        }
                      }}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                      aria-label={t('copyButton')}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveHistory(item.id)}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
