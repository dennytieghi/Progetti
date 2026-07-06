# ROADMAP â€” ClasseHub

## V1 â€” Pilota (target: pronto per uso reale su 1 classe)

**Definition of Done V1**: Denny puÃ² creare la classe di suo figlio, iscrivere 20+ genitori reali, pubblicare avvisi e sondaggi per 4 settimane senza chiedere assistenza tecnica.

### V1.0 â€” Fondamenta (settimana 1)
- [ ] Progetto Next.js + Tailwind + shadcn + Supabase.
- [ ] Schema DB + RLS (nessuna tabella children/parent_child).
- [ ] Landing pubblica.
- [ ] Onboarding rappresentante (crea classe â†’ PDF con codice classe + codice emergenza).
- [ ] Onboarding genitore: form richiesta + magic link + schermata attesa.
- [ ] Coda approvazioni per rappresentante + email transazionali (approvato/rifiutato).
- [ ] Guard membership `status='active'`.

### V1.1 â€” Contenuti (settimana 2)
- [ ] Home bacheca (scadenze in cima, feed sotto, filtri per tipo).
- [ ] Crea Avviso.
- [ ] Crea Scadenza.
- [ ] Crea Materiale (con foto opzionale).
- [ ] Dettaglio post pubblico condivisibile.
- [ ] Generatore messaggio WhatsApp + pulsante Copia.

### V1.2 â€” Sondaggi (settimana 3)
- [ ] Crea Sondaggio (multipla, anonimo, scadenza).
- [ ] Vota + vedi risultati (post-voto).
- [ ] Chiusura automatica a scadenza.
- [ ] Chiusura manuale dal rappresentante.

### V1.3 â€” Interazione genitori (settimana 3-4)
- [ ] Zona Richieste (genitore invia, rate limit 5/24h).
- [ ] Coda Richieste per rappresentante (triage: converti / archivia / rispondi).
- [ ] Silenzia genitore (mute).

### V1.4 â€” Gestione (settimana 4)
- [ ] Pin/archivio post.
- [ ] Impostazioni classe (nome, lista membri).
- [ ] Rimozione genitore (soft, status='removed').
- [ ] Notifica al genitore rimosso via email.
- [ ] Trasferimento ruolo rappresentante via codice emergenza.
- [ ] Informativa privacy + consenso.
- [ ] PWA manifest + icone + installabilitÃ .

### V1.5 â€” Rifinitura
- [ ] Test manuale end-to-end (TEST_PLAN.md).
- [ ] Test qualitativo su parente 50-60 (UX_PRINCIPLES Â§finale).
- [ ] Dominio custom + email transazionale (SPF/DKIM).
- [ ] Deploy production su Vercel + Supabase eu-central.

## V1.1 â€” Post-pilota (dopo feedback reale)
- Notifiche push web (per chi accetta).
- Email digest opzionale.
- Allegati PDF.
- Export sondaggio in CSV.
- "Marca come letto" per il rappresentante.

## V2 â€” Espansione
- Multi-classe per rappresentante (chi ha due figli in scuole diverse).
- Calendario esportabile `.ics`.
- Ruolo insegnante (read+write ristretto).
- Analytics minima (partecipazione sondaggi, letti).
- Traduzione EN.

## Fuori roadmap (per ora)
- Chat libera. **Mai**. Ãˆ l'anti-tesi del prodotto.
- App nativa. PWA basta.
- Integrazione registri elettronici (Argo, Nuvola, Spaggiari): complessitÃ  enorme, rischio legale.
- Multi-figlio strutturato: i gemelli restano un solo genitore = una sola iscrizione.