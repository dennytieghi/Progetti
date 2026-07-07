# TEST_PLAN — ClasseHub (test manuale end-to-end)

Ogni riga: esegui il passo e spunta se il risultato corrisponde.
Ambiente: `corepack pnpm dev`, dati puliti (cancella `.data/` prima di iniziare).
Usa due browser (normale + incognito) per i due ruoli.

> **Esito verifica del 7 luglio 2026** (eseguita con browser automatizzato
> su `localhost:3000`, dati puliti): tutti i passi spuntati `[x]` sono
> verificati e passano. I passi lasciati `[ ]` restano da fare a mano
> (stampa, upload foto, test con persona vera). Nota: il PoC non ha un
> login per utenti già registrati, quindi il cambio di ruolo è stato
> fatto generando nuovi magic link nello store locale — stesso percorso
> di codice del callback reale.

## 1. Onboarding rappresentante

- [x] Home → "Crea la classe": form con nome classe, nome, email.
- [x] Email non valida → errore in italiano comprensibile.
      ("Controlla l'email: sembra scritta in modo non corretto.")
- [x] Invio corretto → schermata "Controlla la tua email" con riquadro demo.
- [x] Click sul link demo → foglio stampabile con codice classe (6 caratteri,
      senza 0/O/1/I/l) e codice di emergenza (12 caratteri).
- [x] Ricaricando la pagina, il codice di emergenza NON compare più
      (avviso "mostrato una volta sola").
- [ ] "Stampa questo foglio" apre l'anteprima di stampa senza header/nav.
      *(da provare a mano: l'anteprima di stampa non si automatizza)*

## 2. Onboarding genitore (browser incognito)

- [x] Home → "Entra in una classe" con codice sbagliato → errore chiaro.
- [x] Con codice giusto + nome + email + nota → "Controlla la tua email".
- [x] Click sul link demo → schermata "Richiesta inviata" (in attesa).
- [x] Provando ad aprire /c/CODICE direttamente → si torna all'attesa
      (un pending non vede NULLA — ADR-011). Verificato anche /c/CODICE/nuovo.
- [x] Rifare "Entra" con la stessa email → messaggio "hai già chiesto di entrare".

## 3. Approvazioni (rappresentante)

- [x] Impostazioni mostra il badge "1 in attesa".
- [x] Coda approvazioni: nome, email, nota, banner di prudenza.
- [x] "Approva" → richiesta sparisce; nell'outbox c'è l'email di conferma
      ("Sei dentro! La tua richiesta è stata approvata").
- [x] (Genitore) approvato → entra in bacheca. *(verificato con nuovo accesso;
      il pulsante "Controlla se sei stato approvato" usa lo stesso percorso)*
- [x] Secondo genitore di prova → "Rifiuta" con motivo → (genitore) la
      schermata attesa mostra il rifiuto con il motivo → può riprovare.

## 4. Pubblicazione (rappresentante)

- [x] "Pubblica" → 4 scelte spiegate in italiano semplice.
- [x] Avviso: titolo+testo → dopo il salvataggio riquadro verde "Fatto!"
      con testo WhatsApp e pulsante Copia (il testo contiene il link corto).
- [x] Scadenza: data nel passato → errore; data futura → in bacheca compare
      in cima sotto "Prossime scadenze" con "Entro venerdì...".
- [ ] Materiale: foto JPG < 5MB → visibile nel dettaglio; file > 5MB → errore.
      *(da provare a mano: upload file)*
- [x] Sondaggio: meno di 2 opzioni → errore ("Servono almeno 2 opzioni");
      con 3 opzioni + data → ok. Anche data mancante → errore chiaro.

## 5. Bacheca e dettaglio

- [x] Scadenze future in alto, resto sotto in ordine di data.
- [ ] Filtri per tipo funzionano. *(visibili, non cliccati — da provare a mano)*
- [x] "Metti in evidenza" → post in cima con etichetta; "Togli" lo rimuove.
- [x] "Archivia" → modal "Sì, archivia / No, torna indietro" → sparisce dalla
      bacheca; il rappresentante lo ritrova con "Mostra archiviati"
      (etichetta ARCHIVIATO) e può ripristinarlo con "Riporta in bacheca".

## 6. Sondaggi (genitore)

- [x] Prima del voto i risultati NON si vedono.
- [x] Voto con 0 opzioni → errore gentile ("Scegli almeno una risposta").
- [x] Voto valido (anche 2 opzioni) → subito i risultati con barre.
- [x] Ricaricando: "Hai votato" + risultati (niente doppio voto).
- [x] In `.data/db.json` i voti hanno solo `voter_hash`, MAI l'id utente.
- [x] (Rappresentante) "Chiudi il sondaggio adesso" → conferma → il genitore
      vede "Il sondaggio è chiuso" e i risultati.

## 7. Richieste dei genitori

- [x] (Genitore) Invia richiesta → conferma verde + compare nello storico.
- [x] 6ª richiesta nelle 24h → errore "massimo 5" ("Hai già inviato 5
      richieste nelle ultime 24 ore").
- [x] (Rappresentante) Coda con nome autore e testo.
- [x] "Trasforma in avviso" → form precompilato col testo → pubblicando,
      la richiesta risulta "Pubblicata in bacheca" per il genitore, con link.
- [ ] "Archivia" → finisce tra le gestite. *(non provato)*

## 8. Silenzia / Rimuovi

- [x] Silenzia genitore → il genitore legge la bacheca ma il form di voto e
      di richiesta sono sostituiti da "il rappresentante ha disattivato...".
- [x] Riattiva → torna tutto normale (il voto funziona di nuovo).
- [x] Rimuovi → modal di conferma → il genitore al prossimo accesso torna
      al form di ingresso (codice precompilato); email "Non fai più parte
      della classe" nell'outbox.

## 9. Sicurezza (tentativi ostili)

- [x] Genitore (pending) prova /c/CODICE/nuovo → rimandato all'attesa.
- [x] Genitore (attivo) prova /c/CODICE/impostazioni/approvazioni →
      rimandato in bacheca.
- [x] Utente della classe A prova /c/CODICE_B → form di ingresso, nessun dato.
      *(verificato con una seconda classe "5B Scuola Verdi")*
- [x] Senza membership, /c/CODICE → form di ingresso col codice precompilato.
- [x] Link magico riusato due volte → "link non più valido".

## 10. Qualità percepita (prima del pilota — UX_PRINCIPLES §finale)

- [ ] Test con un 50-60enne: da link WhatsApp al voto in <90 secondi e ≤5 tap.
