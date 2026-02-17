'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/layout/container';
import { PageHeader } from '@/components/layout/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type FormState = 'idle' | 'loading' | 'success' | 'error';

interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const SUBJECTS = [
  'Question sur le programme ambassadeur',
  'Problème avec ma commande',
  'Demande de remboursement',
  'Question sur le cashback',
  'Signalement de fraude',
  'Presse / Partenariat',
  'Autre',
];

export default function ContactPage() {
  const t = useTranslations('contact');

  const [form, setForm] = useState<ContactForm>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<ContactForm>>({});
  const [formState, setFormState] = useState<FormState>('idle');

  function validate(): boolean {
    const newErrors: Partial<ContactForm> = {};
    if (!form.name.trim()) newErrors.name = 'Veuillez renseigner votre nom.';
    if (!form.email.trim()) {
      newErrors.email = 'Veuillez renseigner votre email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Adresse email invalide.';
    }
    if (!form.subject) newErrors.subject = 'Veuillez sélectionner un sujet.';
    if (!form.message.trim()) {
      newErrors.message = 'Veuillez saisir votre message.';
    } else if (form.message.trim().length < 20) {
      newErrors.message = 'Votre message doit comporter au moins 20 caractères.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setFormState('loading');
    try {
      // Simulate API call — replace with real endpoint
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setFormState('success');
      setForm({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    } catch {
      setFormState('error');
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ContactForm]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  return (
    <div className="py-12">
      <Container className="max-w-4xl">
        <PageHeader
          title={t('title')}
          description={t('description')}
        />

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-5">

          {/* ---------------------------------------------------------------- */}
          {/* Left — Contact info                                               */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-gray-50 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Nous contacter</h2>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Notre équipe répond dans un délai de <strong>24 à 48 heures</strong> (jours ouvrés).
                </p>
              </div>

              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs">@</span>
                  <div>
                    <p className="font-medium text-gray-800">Email</p>
                    <a href="mailto:contact@buyla.fr" className="text-primary-600 hover:underline">contact@buyla.fr</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs">📍</span>
                  <div>
                    <p className="font-medium text-gray-800">Adresse</p>
                    <p>Buyla SAS<br />42 rue de la Paix<br />75002 Paris, France</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600 font-bold text-xs">?</span>
                  <div>
                    <p className="font-medium text-gray-800">FAQ</p>
                    <a href="/faq" className="text-primary-600 hover:underline">Consulter la FAQ</a>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 text-xs text-gray-400">
                Buyla SAS — SIRET 123 456 789 00012<br />
                RCS Paris B 123 456 789
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Right — Form                                                      */}
          {/* ---------------------------------------------------------------- */}
          <div className="lg:col-span-3">
            {formState === 'success' ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                <div className="mb-3 text-4xl">✓</div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">Message envoyé !</h3>
                <p className="text-green-700 text-sm leading-relaxed">
                  Merci pour votre message. Notre équipe vous répondra dans les 24 à 48 heures ouvrées.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-6"
                  onClick={() => setFormState('idle')}
                >
                  Envoyer un autre message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input
                    label="Nom complet *"
                    name="name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={form.name}
                    onChange={handleChange}
                    error={errors.name}
                    autoComplete="name"
                  />
                  <Input
                    label="Adresse email *"
                    name="email"
                    type="email"
                    placeholder="jean@exemple.fr"
                    value={form.email}
                    onChange={handleChange}
                    error={errors.email}
                    autoComplete="email"
                  />
                </div>

                {/* Subject select — using native select styled to match Input */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="subject" className="text-sm font-medium text-gray-700">
                    Sujet *
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className={[
                      'w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 bg-white transition-colors duration-150',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-transparent',
                      errors.subject
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 hover:border-gray-400',
                    ].join(' ')}
                    aria-invalid={errors.subject ? true : undefined}
                  >
                    <option value="">Sélectionner un sujet…</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="text-sm text-red-600">{errors.subject}</p>
                  )}
                </div>

                {/* Message textarea */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="message" className="text-sm font-medium text-gray-700">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={6}
                    placeholder="Décrivez votre demande en détail…"
                    value={form.message}
                    onChange={handleChange}
                    className={[
                      'w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white',
                      'transition-colors duration-150 resize-y',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 focus:border-transparent',
                      errors.message
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 hover:border-gray-400',
                    ].join(' ')}
                    aria-invalid={errors.message ? true : undefined}
                  />
                  {errors.message && (
                    <p className="text-sm text-red-600">{errors.message}</p>
                  )}
                </div>

                {formState === 'error' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Une erreur est survenue lors de l'envoi. Veuillez réessayer ou nous contacter directement par email.
                  </div>
                )}

                <p className="text-xs text-gray-400 leading-relaxed">
                  En soumettant ce formulaire, vous acceptez que vos données soient utilisées pour traiter votre demande, conformément à notre{' '}
                  <a href="/confidentialite" className="text-primary-600 hover:underline">Politique de confidentialité</a>.
                </p>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={formState === 'loading'}
                  className="w-full sm:w-auto"
                >
                  Envoyer le message
                </Button>
              </form>
            )}
          </div>

        </div>
      </Container>
    </div>
  );
}
