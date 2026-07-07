# TEST_PLAN — ClasseHub (test manuale end-to-end)

Ogni riga: esegui il passo e spunta se il risultato corrisponde.
Ambiente: `corepack pnpm dev`, dati puliti (cancella `.data/` prima di iniziare).
Usa due browser (normale + incognito) per i due ruoli.

## 1. Onboarding rappresentante

- [ ] Home → "Crea la classe": form con nome classe, nome, email.
- [ ] Email non valida → errore in italiano comprensibile.
- [ ] Invio corretto → schermata "Controlla la tua email" con riquadro demo.
- [ ] Click sul link demo → foglio stampabile con codice classe (6 caratteri,
      senza 0/O/1/I/l) e codice di emergenza (12 caratteri).
- [ ] Ricaricando la pagina, il codice di emergenza NON compare più
      (avviso "mostrato una volta sola").
- [ ] "Stampa questo foglio" apre l'anteprima di stampa senza header/nav.

## 2. Onboarding genitore (browser incognito)

- [ ] Home → "Entra in una classe" con codice sbagliato → errore chiaro.
- [ ] Con codice giusto + nome + email + nota → "Controlla la tua email".
- [ ] Click sul link demo → schermata "Richiesta inviata" (in attesa).
- [ ] Provando ad aprire /c/CODICE direttamente → si torna all'attesa
      (un pending non vede NULLA — ADR-011).
- [ ] Rifare "Entra" con la stessa email → messaggio "hai già chiesto di entrare".

## 3. Approvazioni (rappresentante)

- [ ] Impostazioni mostra il badge "1 in attesa".
- [ ] Coda approvazioni: nome, email, nota, banner di prudenza.
- [ ] "Approva" → richiesta sparisce; nel log server c'è l'email di conferma.
- [ ] (Genitore) "Controlla se sei stato approvato" → entra in bacheca.
- [ ] Secondo genitore di prova → "Rifiuta" con motivo → (genitore) la
      schermata attesa mostra il rifiuto con il motivo → può riprovare.

## 4. Pubblicazione (rappresentante)

- [ ] "Pubblica" → 4 scelte spiegate in italiano semplice.
- [ ] Avviso: titolo+testo → dopo il salvataggio riquadro verde "Fatto!"
      con testo WhatsApp e pulsante Copia (il testo contiene il link corto).
- [ ] Scadenza: data nel passato → errore; data futura → in bacheca compare
      in cima sotto "Prossime scadenze" con "Entro venerdì...".
- [ ] Materiale: foto JPG < 5MB → visibile nel dettaglio; file > 5MB → errore.
- [ ] Sondaggio: meno di 2 opzioni → errore; con 3 opzioni + data → ok.

## 5. Bacheca e dettaglio

- [ ] Scadenze future in alto, resto sotto in ordine di data.
- [ ] Filtri per tipo funzionano.
- [ ] "Metti in evidenza" → post in cima con etichetta; "Togli" lo rimuove.
- [ ] "Archivia" → modal "Sì, archivia / No, torna indietro" → sparisce dalla
      bacheca del genitore; il rappresentante lo ritrova con "Mostra archiviati"
      e può ripristinarlo.

## 6. Sondaggi (genitore)

- [ ] Prima del voto i risultati NON si vedono.
- [ ] Voto con 0 opzioni → errore gentile.
- [ ] Voto valido (anche 2 opzioni) → subito i risultati con barre.
- [ ] Ricaricando: "Hai votato" + risultati (niente doppio voto).
- [ ] In `.data/db.json` i voti hanno solo `voter_hash`, MAI l'id utente.
- [ ] (Rappresentante) "Chiudi il sondaggio adesso" → conferma → il genitore
      vede "Il sondaggio è chiuso" e i risultati.

## 7. Richieste dei genitori

- [ ] (Genitore) Invia richiesta → conferma verde + compare nello storico.
- [ ] 6ª richiesta nelle 24h → errore "massimo 5".
- [ ] (Rappresentante) Badge sul menu; coda con nome autore e testo.
- [ ] "Trasforma in avviso" → form precompilato col testo → pubblicando,
      la richiesta risulta "Pubblicata in bacheca" per il genitore, con link.
- [ ] "Archivia" → finisce tra le gestite.

## 8. Silenzia / Rimuovi

- [ ] Silenzia genitore → il genitore legge la bacheca ma vota/scrive → 
      messaggio "il rappresentante ha disattivato...".
- [ ] Riattiva → torna tutto normale.
- [ ] Rimuovi → modal di conferma → il genitore al prossimo accesso torna
      al form di ingresso; email di notifica nel log.

## 9. Sicurezza (tentativi ostili)

- [ ] Genitore prova ad aprire /c/CODICE/nuovo → rimandato in bacheca.
- [ ] Genitore prova /c/CODICE/impostazioni/approvazioni → rimandato in bacheca.
- [ ] Utente della classe A prova /c/CODICE_B → form di ingresso, nessun dato.
- [ ] Senza login, /c/CODICE → form di ingresso col codice precompilato.
- [ ] Link magico riusato due volte → "link non più valido".

## 10. Qualità percepita (prima del pilota — UX_PRINCIPLES §finale)

- [ ] Test con un 50-60enne: da link WhatsApp al voto in <90 secondi e ≤5 tap.
