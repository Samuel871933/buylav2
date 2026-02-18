# TODO — Phase A : Points manquants

## Priorité Haute (P0)

### Auth & Sécurité
- [x] **Password reset tokens en BDD** — Table `password_reset_tokens` (token_hash, expires_at, used_at). Email de reset envoyé via Resend. Tokens single-use avec expiration 1h.
- [x] **OAuth Google** — Endpoint `POST /api/auth/google` avec `google-auth-library`. Bouton Google Identity Services sur connexion/inscription. Find-or-create user par email.
- [x] **CSRF tokens** — Middleware `csrf-csrf` (double-submit cookie `__csrf`). Routes auth/webhooks/tracking exemptées. Endpoint `GET /api/auth/csrf-token`. Helper `api-client.ts` côté frontend.
- [x] **Headers CSP complets** — CSP strict dans `next.config.mjs` (script/style/img/connect/frame/font-src). Helmet configuré avec directives explicites côté API.

### Emails automatisés (Resend)
- [ ] **Email J+1 guide démarrage** — 3 étapes première vente, exemples de messages à partager.
- [ ] **Recap hebdomadaire** — CRON lundi 9h : stats semaine (ventes, gains, classement).
- [ ] **Relance 14j inactif** — Email de relance pour ambassadeurs sans activité depuis 14 jours.
- [ ] **Relance 30j inactif** — Email de relance avec top produits du moment.
- [ ] **Email seuil cashback atteint** — Notification quand `balance >= seuil` pour inciter au retrait.
- [ ] **Email cashback en attente** — Pour les conversions avec `buyer_user_id` mais sans compte.
- [ ] **Recap quotidien admin** — Email 8h avec résumé : ventes, CA, marge, alertes.

### Réconciliation & CRON
- [ ] **CRON réconciliation quotidienne** — Boucle sur `affiliate_programs` actifs et applique la méthode de réconciliation (postback check, csv_import, api_scheduled).
- [ ] **Import CSV admin amélioré** — Matching automatique par `sub_id` / `order_ref`, config mapping par programme (`csv_import_config` JSON).

## Priorité Moyenne (P1)

### SEO & Référencement
- [ ] **Sitemap dynamique** — Générer `sitemap.xml` avec toutes les pages publiques (fr + en).
- [ ] **Robots.txt** — Configurer `robots.txt` (bloquer /admin, /api, autoriser le reste).
- [ ] **JSON-LD Schema.org** — `Organization` sur homepage, `FAQPage` sur /faq, `BreadcrumbList` sur les pages.
- [ ] **Meta OG / Twitter Cards** — Balises Open Graph et Twitter sur chaque page publique.
- [ ] **Balises hreflang** — Indiquer les versions fr/en de chaque page pour Google.
- [ ] **Canonical URLs** — Éviter le contenu dupliqué entre /fr/... et /en/...

### Blog ambassadeur
- [ ] **Page /blog** — Liste d'articles SEO : "Comment devenir ambassadeur", "Gagner de l'argent en affiliation", etc.
- [ ] **Page /blog/[slug]** — Article individuel avec contenu markdown, liens internes, CTA.
- [ ] **Modèle BDD blog_posts** — Table avec title, slug, content, meta_title, meta_description, is_published.
- [ ] **Admin /admin/contenu** — CRUD articles blog depuis le back-office.

### Composants spécialisés
- [ ] **TierProgress** — Barre de progression palier suivant (ventes actuelles / seuil palier suivant).
- [ ] **LinkGenerator** — Composant input URL → détection marchand → génération lien → copier + QR code.
- [ ] **CashbackBadge** — Badge gradient "X% cashback" avec animation pulse.
- [ ] **AffiliateLink** — Composant générique qui intercepte le clic, appelle /tracking/click, redirige.
- [ ] **Chart.tsx** — Wrapper Recharts réutilisable pour les graphiques dashboard/admin.

### Graphiques Admin (Recharts)
- [ ] **CA + marge évolution** — LineChart 2 lignes par jour.
- [ ] **Funnel conversion** — Visites → Clics → Conversions (taux à chaque étape).
- [ ] **Cashback distribué vs retiré** — LineChart par mois montrant le float.
- [ ] **Heatmap activité** — Clics par heure × jour de la semaine.

## Priorité Basse (P2)

### Payouts & Finance
- [ ] **Chiffrement AES-256 IBAN** — Vérifier que l'IBAN est effectivement chiffré en BDD et déchiffré uniquement à l'affichage/virement.
- [ ] **Releve annuel PDF** — Générer un PDF récapitulatif annuel par ambassadeur (revenus, ventilation).
- [ ] **Stripe Connect (prep)** — Préparer l'intégration Stripe Connect Express pour payouts automatiques (Phase C).

### Performance & Robustesse
- [ ] **Lighthouse > 90** — Optimiser Core Web Vitals (LCP, FID, CLS).
- [ ] **ISR / Cache** — Mettre en cache les pages publiques (revalidation 60s).
- [ ] **Lazy loading images** — Utiliser `next/image` partout avec loading="lazy".
- [ ] **Skeleton loading** — Ajouter des squelettes de chargement sur dashboard et admin.
- [ ] **Error Boundary React** — Capturer les erreurs frontend gracefully.

### Tests
- [ ] **Tests unitaires** — Vitest : `calculateShares()`, `buildAffiliateRedirectUrl()`, `fraud-detection`, `settings`.
- [ ] **Tests intégration** — Vitest + Supertest : flux postback → conversion → balances.
- [ ] **Tests E2E** — Playwright : inscription → partage lien → dashboard.

### Dark Mode
- [ ] **Préparation dark mode** — Ajouter `dark:` variants Tailwind sur les composants de base (pas prioritaire MVP).

### RGPD
- [ ] **API /api/auth/me/export** — Export JSON de toutes les données personnelles.
- [ ] **API /api/auth/me/delete** — Anonymisation + désactivation du compte.
- [ ] **Bannière cookie** — Vérifier que le consentement bloque effectivement les cookies avant acceptation.
