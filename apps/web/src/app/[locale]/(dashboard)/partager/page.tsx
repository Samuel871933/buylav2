'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Copy,
  Check,
  MessageCircle,
  Send,
  Share2,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { API_URL, SITE_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)buyla_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return typeof window !== 'undefined' ? localStorage.getItem('buyla_token') : null;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PartagerPage() {
  const t = useTranslations('sharing');

  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    fetch(`${API_URL}/api/ambassador/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const code = json?.data?.stats?.referralCode || json?.data?.referralCode || '';
        setReferralCode(code);
        setReferralLink(`${SITE_URL}/rejoindre?ref=${code}`);
      })
      .catch(() => {});
  }, []);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  // Social sharing URLs
  const shareText = encodeURIComponent(
    t('template1Text', { link: referralLink }),
  );
  const shareUrl = encodeURIComponent(referralLink);

  const socialLinks = [
    {
      id: 'whatsapp',
      label: t('whatsapp'),
      icon: <MessageCircle className="h-5 w-5" />,
      color: 'bg-green-500 hover:bg-green-600',
      url: `https://wa.me/?text=${shareText}`,
    },
    {
      id: 'telegram',
      label: t('telegram'),
      icon: <Send className="h-5 w-5" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      url: `https://t.me/share/url?url=${shareUrl}&text=${shareText}`,
    },
    {
      id: 'twitter',
      label: t('twitter'),
      icon: <Share2 className="h-5 w-5" />,
      color: 'bg-gray-900 hover:bg-gray-800',
      url: `https://twitter.com/intent/tweet?text=${shareText}`,
    },
    {
      id: 'facebook',
      label: t('facebook'),
      icon: <Share2 className="h-5 w-5" />,
      color: 'bg-blue-600 hover:bg-blue-700',
      url: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    },
  ];

  // Message templates
  const templates = [
    {
      title: t('template1Title'),
      text: t('template1Text', { link: referralLink }),
    },
    {
      title: t('template2Title'),
      text: t('template2Text', { product: 'ce produit', rate: '10', link: referralLink }),
    },
    {
      title: t('template3Title'),
      text: t('template3Text', { code: referralCode }),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      {/* Referral link */}
      <Card className="mt-6">
        <h3 className="text-sm font-semibold text-gray-700">{t('copyLink')}</h3>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700">
            {referralLink || '...'}
          </code>
          <button
            onClick={() => handleCopy(referralLink, 'link')}
            className="rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            {copied === 'link' ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> {t('copied')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Copy className="h-4 w-4" /> {t('copyLink')}
              </span>
            )}
          </button>
        </div>
      </Card>

      {/* Social media buttons */}
      <Card className="mt-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('socialMedia')}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {socialLinks.map((social) => (
            <a
              key={social.id}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition ${social.color}`}
            >
              {social.icon}
              {social.label}
            </a>
          ))}
        </div>
      </Card>

      {/* Message templates */}
      <Card className="mt-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('templates')}</h3>
        <div className="space-y-4">
          {templates.map((tmpl, i) => (
            <div key={i} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-700">{tmpl.title}</h4>
                <button
                  onClick={() => handleCopy(tmpl.text, `template-${i}`)}
                  className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                >
                  {copied === `template-${i}` ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{tmpl.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
