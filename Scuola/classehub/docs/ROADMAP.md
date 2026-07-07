# ROADMAP — ClasseHub

## V1 — Pilota (target: pronto per uso reale su 1 classe)

**Definition of Done V1**: Denny può creare la classe di suo figlio, iscrivere 20+ genitori reali, pubblicare avvisi e sondaggi per 4 settimane senza chiedere assistenza tecnica.

### V1.0 — Fondamenta (settimana 1)
- [ ] Progetto Next.js + Tailwind + shadcn + Supabase.
- [ ] Schema DB + RLS (nessuna tabella children/parent_child).
- [ ] Landing pubblica.
- [ ] Onboarding rappresentante (crea classe → PDF con codice classe + codice emergenza).
- [ ] Onboarding genitore: form richiesta + magic link + schermata attesa.
- [ ] Coda approvazioni per rappresentante + email transazionali (approvato/rifiutato).
- [ ] Guard membership `status='active'`.

### V1.1 — Contenuti (settimana 2)
- [ ] Home bacheca (scadenze in cima, feed sotto, filtri per tipo).
- [ ] Crea Avviso.
- [ ] Crea Scadenza.
- [ ] Crea Materiale (con foto opzionale).
- [ ] Dettaglio post pubblico condivisibile.
- [ ] Generatore messaggio WhatsApp + pulsante Copia.

### V1.2 — Sondaggi (settimana 3)
- [ ] Crea Sondaggio (multipla, anonimo, scadenza).
- [ ] Vota + vedi risultati (post-voto).
- [ ] Chiusura automatica a scadenza.
- [ ] Chiusura manuale dal rappresentante.

### V1.3 — Interazione genitori (settimana 3-4)
- [ ] Zona Richieste (genitore invia, rate limit 5/24h).
- [ ] Coda Richieste per rappresentante (triage: converti / archivia / rispondi).
- [ ] Silenzia genitore (mute).

### V1.4 — Gestione (settimana 4)
- [ ] Pin/archivio post.
- [ ] Impostazioni classe (nome, lista membri).
- [ ] Rimozione genitore (soft, status='removed').
- [ ] Notifica al genitore rimosso via email.
- [ ] Trasferimento ruolo rappresentante via codice emergenza.
- [ ] Informativa privacy + consenso.
- [ ] PWA manifest + icone + installabilità.

### V1.5 — Rifinitura
- [ ] Accesso per utenti già registrati: form "Sei già dentro? Ricevi un
      nuovo link" che rispedisce il magic link. Senza, un membro che fa
      "Esci" o cambia telefono resta chiuso fuori (emerso nel test
      end-to-end del 7/7/2026 — il link è monouso e "Entra" rifiuta chi
      è già membro).
- [ ] Test manuale end-to-end (TEST_PLAN.md).
- [ ] Test qualitativo su parente 50-60 (UX_PRINCIPLES §finale).
- [ ] Dominio custom + email transazionale (SPF/DKIM).
- [ ] Deploy production su Vercel + Supabase eu-central.

## V1.1 — Post-pilota (dopo feedback reale)
- Notifiche push web (per chi accetta).
- Email digest opzionale.
- Allegati PDF.
- Export sondaggio in CSV.
- "Marca come letto" per il rappresentante.

## V2 — Espansione
- Multi-classe per rappresentante (chi ha due figli in scuole diverse).
- Calendario esportabile `.ics`.
- Ruolo insegnante (read+write ristretto).
- Analytics minima (partecipazione sondaggi, letti).
- Traduzione EN.

## Fuori roadmap (per ora)
- Chat libera. **Mai**. È l'anti-tesi del prodotto.
- App nativa. PWA basta.
- Integrazione registri elettronici (Argo, Nuvola, Spaggiari): complessità enorme, rischio legale.
- Multi-figlio strutturato: i gemelli restano un solo genitore = una sola iscrizione.
