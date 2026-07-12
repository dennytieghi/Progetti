# TEST_PLAN — ClasseHub (test manuale end-to-end)

Ogni riga: esegui il passo e spunta se il risultato corrisponde.
Ambiente: `corepack pnpm dev`, dati puliti (cancella `.data/` prima di iniziare).
Usa due browser (normale + incognito) per i due ruoli.

> **Esito verifica del 7 luglio 2026**: tutti i passi `[x]` passano
> (verifica con browser automatizzato su `localhost:3000` con dati
> puliti + test manuali di Denny per stampa, foto, filtri e archivio
> richieste). Resta solo il §10 (test con una persona vera).
> Il test manuale ha trovato un bug reale sull'upload foto, corretto
> in `855fb8c`. Nota: il PoC non ha un login per utenti già registrati,
> quindi il cambio di ruolo è stato fatto con `scripts/dev-login.js`,
> che genera magic link nello store locale — stesso percorso di codice
> del callback reale.

## 1. Onboarding rappresentante

- [x] Home → "Crea la classe": form con nome classe, nome, email.
- [x] Email non valida → errore in italiano comprensibile.
      ("Controlla l'email: sembra scritta in modo non corretto.")
- [x] Invio corretto → schermata "Controlla la tua email" con riquadro demo.
- [x] Click sul link demo → foglio stampabile con codice classe (6 caratteri,
      senza 0/O/1/I/l) e codice di emergenza (12 caratteri).
- [x] Ricaricando la pagina, il codice di emergenza NON compare più
      (avviso "mostrato una volta sola").
- [x] "Stampa questo foglio" apre l'anteprima di stampa senza header/nav.
      *(verificato a mano da Denny, 7/7/2026)*

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
- [x] Materiale: foto JPG < 5MB → visibile nel dettaglio; file > 5MB → errore
      chiaro nel form, tipo sbagliato → errore chiaro, campo svuotato.
      *(il test manuale del 7/7/2026 ha trovato un bug: qualsiasi invio
      sopra 1 MB crashava con errore grezzo — corretto in `855fb8c` e
      riverificato: 2 MB pubblica e la foto si vede, 6 MB dà il
      messaggio gentile senza nemmeno partire)*
- [x] Sondaggio: meno di 2 opzioni → errore ("Servono almeno 2 opzioni");
      con 3 opzioni + data → ok. Anche data mancante → errore chiaro.

## 5. Bacheca e dettaglio

- [x] Scadenze future in alto, resto sotto in ordine di data.
- [x] Filtri per tipo funzionano. *(verificato a mano da Denny, 7/7/2026)*
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
- [x] "Archivia" → finisce tra le gestite. *(verificato a mano da Denny, 7/7/2026)*

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

## 11. Cassa — pagamenti semplici

- [ ] Rappresentante compila coordinate (IBAN + intestatario, link PayPal,
      numero Satispay) in Impostazioni → il genitore le vede nel riquadro
      "Come pagare" in cassa e riesce a copiare l'IBAN.
- [ ] Genitore dichiara un versamento di 10 € col metodo bonifico → il
      rappresentante vede "Da confermare (1)" in cima alla cassa → conferma
      → saldi e storico aggiornati con metodo "bonifico".
- [ ] Rappresentante rifiuta una dichiarazione → il genitore la vede
      "rifiutata", i saldi restano invariati.
- [ ] Genitore prova a inviare una sesta dichiarazione in attesa → bloccato
      con messaggio chiaro sul limite di 5.
- [ ] Export CSV include la colonna "Metodo" coi valori corretti.
- [ ] Riquadro "Come pagare" con solo l'IBAN compilato → mostra solo l'IBAN,
      niente righe vuote per PayPal/Satispay.
- [ ] Un genitore non vede le dichiarazioni in attesa di un altro genitore
      (solo le proprie; il rappresentante vede tutte).

## 12. Cassa — vista genitore ristretta

- [ ] Laura (genitore) apre la cassa → vede "Quanto ti resta" col suo saldo
      in grande, la lista SOLO dei suoi movimenti con le sue quote, e il
      totale della classe in fondo alla pagina, piccolo.
- [ ] Giovanni (genitore senza movimenti) apre la cassa → lista vuota, ma il
      totale della classe in fondo compare comunque.
- [ ] Export CSV: quello di Laura contiene solo le sue righe; quello di
      Denise (rappresentante) tutte le righe.
- [ ] Denise (rappresentante) vede la cassa identica a prima (saldi per
      membro, Da confermare, registra movimenti, filtri).
- [ ] Probe ostile: chiamata alla RPC `class_cash_total` con il class_id di
      un'altra classe → errore, nessun totale restituito.
- [ ] Probe ostile: un membro RIMOSSO dalla classe non legge più i movimenti
      né il totale via API (con la sua sessione ancora valida: lista
      movimenti vuota, RPC `class_cash_total` rifiutata).

## 13. Cassa — home rappresentante riorganizzata

- [x] Rappresentante apre `/cassa` → saldo "In cassa adesso" in cima, grande;
      se ci sono debitori, sotto compare "N genitori devono ancora versare
      X €"; segue "Da confermare (N)" se ci sono dichiarazioni in attesa; due
      pulsanti "Ho ricevuto soldi" / "Ho speso soldi"; "Chi deve versare" con
      solo i saldi negativi e un pulsante "Ha pagato" per ciascuno; accordion
      chiuso "N genitori sono a posto"; "Le ultime entrate e uscite" (ultime
      5, senza Modifica/Elimina).
- [x] "Ha pagato" su un debitore → `/cassa/versamento` col genitore già
      scelto e l'importo dovuto precompilato → "Registra il versamento" →
      schermata di conferma con "prima: X €" e la lista di chi manca ancora
      → da lì, "Ha pagato" sul debitore successivo senza tornare alla home:
      due versamenti di fila.
- [x] Dalla schermata di conferma, "Annulla questo versamento" → "Sì,
      annulla" → il saldo torna esattamente com'era prima del versamento.
- [x] Versamento in anticipo: in `/cassa/versamento` scegli un genitore
      "a posto" → la micro-copy sotto l'importo dice "Non deve niente: sta
      versando in anticipo"; il link "ha pagato in un altro modo?" apre il
      selettore dei metodi di pagamento.
- [x] "Ho speso soldi" → form spesa su pagina dedicata → dopo il salvataggio,
      banner di conferma sulla home della cassa.
- [x] "Vedi tutti" → `/cassa/movimenti` con lo storico completo: i filtri
      Tutti/Versamenti/Spese e per genitore funzionano, Modifica ed Elimina
      su una riga funzionano come oggi.
- [x] "Excel" (da home e da `/cassa/movimenti`) → il CSV scaricato rispetta i
      filtri attivi nella pagina da cui è stato lanciato.
- [x] "Ricorda a tutti" → `/cassa/promemoria` col testo WhatsApp che include
      il nome della classe nel titolo (es. "💰 CASSA DI CLASSE — 5B
      Simulazione — Servono nuovi versamenti"), nessun importo personale nel
      testo, "Copia" funziona.
- [x] Genitore (Laura) apre la cassa → vista INVARIATA: "Quanto ti resta" col
      suo saldo, lista dei soli suoi movimenti, totale di classe in fondo,
      come prima della riorganizzazione.

## 14. Cassa — spesa a importo totale (diviso pro-quota)

- [x] Spesa che non si divide esattamente: 10,00 € tra 3 partecipanti →
      l'anteprima dice "Diviso tra 3: 3,33 € a testa. Per far tornare il
      totale, uno di loro paga 3,34 €." → dopo il salvataggio il movimento
      in lista vale esattamente 10,00 € e la card mostra "3 partecipanti"
      senza "× a testa" (le quote non sono uguali).
- [x] Spesa che si divide esattamente: 12,00 € tra 4 → anteprima "Diviso
      tra 4: 3,00 € a testa." senza nota sul resto; la card in lista mostra
      "4 partecipanti × 3,00 € a testa".
- [x] Modifica di una spesa → il form si apre con l'importo TOTALE
      precompilato (non quello a testa); cambiare i partecipanti ricalcola
      le quote e il totale resta quello scritto.
- [x] Importo troppo piccolo: 0,02 € tra 3 partecipanti → avviso sotto il
      form e, se si prova a salvare, errore chiaro senza movimento creato.
- [x] Genitore: sulla sua riga vede la SUA quota esatta (3,33 € o 3,34 €) e
      il saldo personale scende di quella cifra.

## 15. Pubblicazione — scorciatoie

- [x] Nuovo post → scegli "Avviso" → sopra il form compare la fila di
      scorciatoie (Uscita anticipata, Entrata posticipata, Sciopero,
      Assemblea/riunione, Portare domani) + "Scrivo io"; un tap su
      "Sciopero" riempie titolo e testo, entrambi ancora modificabili.
- [x] Sondaggio → tap su "Adesione gita" riempie la domanda e le due
      opzioni ("Sì, partecipa" / "No, non partecipa"); tap su "Sì / No"
      lascia la domanda vuota e mette le opzioni Sì/No; il post si
      pubblica e il messaggio WhatsApp esce corretto senza modifiche.
- [x] Tap su una scorciatoia, poi su un'altra → i campi vengono
      sostituiti; "Scrivo io" → campi svuotati e fila nascosta.
- [x] Arrivando da una richiesta genitore ("Trasforma in post") le
      scorciatoie NON compaiono e il testo della richiesta resta.
