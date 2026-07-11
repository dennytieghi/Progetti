/**
 * Tutti i testi visibili all'utente stanno qui (ADR-010).
 * Regole copy: seconda persona singolare, niente gergo tecnico,
 * errori come frasi complete con suggerimento d'azione.
 */
export const it = {
  app: {
    name: "ClasseHub",
    tagline:
      "Le informazioni della classe in un posto solo. Senza perderle nella chat.",
  },

  common: {
    salva: "Salva",
    annulla: "Annulla",
    indietro: "Torna indietro",
    continua: "Continua",
    esci: "Esci",
    caricamento: "Un momento…",
    campoObbligatorio: "Questo campo è obbligatorio.",
    erroreGenerico:
      "Qualcosa non ha funzionato. Riprova tra qualche secondo. Se succede ancora, avvisa il rappresentante.",
    copiato: "Copiato!",
    copiaWhatsapp: "Copia per WhatsApp",
  },

  landing: {
    titolo: "La bacheca della tua classe",
    sottotitolo:
      "Avvisi, scadenze e sondaggi in ordine. WhatsApp resta per parlare, qui trovi le cose importanti.",
    creaClasseCta: "Crea la classe",
    creaClasseSpiega: "Sei il rappresentante? Parti da qui.",
    entraCta: "Entra in una classe",
    entraSpiega: "Hai ricevuto un codice classe? Entra da qui.",
    comeFunzionaTitolo: "Come funziona",
    passo1Titolo: "Il rappresentante crea la classe",
    passo1Testo: "Ottiene un codice da dare ai genitori, anche stampato.",
    passo2Titolo: "I genitori chiedono di entrare",
    passo2Testo:
      "Con il codice classe. Il rappresentante approva ogni richiesta: nessun estraneo.",
    passo3Titolo: "Le informazioni restano in ordine",
    passo3Testo:
      "Avvisi, scadenze e sondaggi in bacheca. Su WhatsApp arriva solo il link.",
  },

  creaClasse: {
    titolo: "Crea la tua classe",
    sottotitolo:
      "Servono meno di 2 minuti. Alla fine ricevi il codice da dare ai genitori.",
    nomeClasseLabel: "Nome della classe",
    nomeClasseEsempio: "Es. 3A Scuola Rossi",
    nomeTuoLabel: "Il tuo nome e cognome",
    nomeTuoEsempio: "Es. Denise Bianchi",
    emailLabel: "La tua email",
    emailEsempio: "Es. denise@esempio.it",
    emailSpiega: "Ti mandiamo un'email con il link per confermare. Niente password.",
    invia: "Crea la classe",
    erroreNomeClasse: "Scrivi il nome della classe, ad esempio “3A Scuola Rossi”.",
    erroreNome: "Scrivi il tuo nome e cognome.",
    erroreEmail: "Controlla l'email: sembra scritta in modo non corretto.",
  },

  entra: {
    titolo: "Entra nella tua classe",
    sottotitolo:
      "Ti serve il codice classe. Se non ce l'hai, chiedilo al rappresentante.",
    codiceLabel: "Codice classe",
    codiceEsempio: "Es. A7K3M9",
    nomeLabel: "Il tuo nome e cognome",
    nomeEsempio: "Es. Giovanni Verdi",
    nomeSpiega: "Il rappresentante deve riconoscerti: usa il tuo nome vero.",
    emailLabel: "La tua email",
    emailEsempio: "Es. giovanni@esempio.it",
    emailSpiega: "Ti mandiamo un'email con il link per entrare. Niente password.",
    notaLabel: "Nota per il rappresentante (facoltativa)",
    notaEsempio: "Es. Sono il papà di Marco",
    notaSpiega: "Aiuta il rappresentante a riconoscerti e ad approvarti prima.",
    invia: "Chiedi di entrare",
    erroreCodice:
      "Il codice classe che hai scritto non esiste. Controlla che sia esatto o chiedilo al rappresentante.",
    erroreNome: "Scrivi il tuo nome e cognome.",
    erroreEmail: "Controlla l'email: sembra scritta in modo non corretto.",
    giaMembro: "Fai già parte di questa classe. Entra dalla tua bacheca.",
    giaRichiesta:
      "Hai già chiesto di entrare in questa classe. Aspetta che il rappresentante ti approvi: riceverai un'email.",
  },

  controllaEmail: {
    titolo: "Controlla la tua email",
    testo:
      "Ti abbiamo mandato un'email con un pulsante per continuare. Aprila e premi il pulsante.",
    spam: "Non la trovi? Controlla anche in spam o posta indesiderata.",
    demoTitolo: "Modalità dimostrazione",
    demoTesto:
      "In questa versione di prova l'email non parte davvero. Usa il pulsante qui sotto per continuare.",
    demoBottone: "Apri il link dell'email (demo)",
  },

  inAttesa: {
    titolo: "Richiesta inviata",
    testo:
      "Il rappresentante deve approvarti prima che tu possa vedere la bacheca. Riceverai un'email quando ti fa entrare.",
    tempi:
      "L'approvazione può richiedere qualche giorno. Se dopo 5 giorni non hai avuto risposta, chiedi al rappresentante.",
    spam: "Controlla anche in spam o posta indesiderata quando arriverà l'email.",
    ricontrolla: "Controlla se sei stato approvato",
    rifiutataTitolo: "Richiesta non approvata",
    rifiutataTesto:
      "Il rappresentante non ha approvato la tua richiesta. Se pensi sia un errore, parlagli direttamente e riprova.",
    rifiutataMotivo: "Motivo indicato dal rappresentante:",
    riprova: "Fai una nuova richiesta",
  },

  auth: {
    linkNonValido:
      "Questo link non è più valido. Torna alla pagina iniziale e riprova: riceverai un'email nuova.",
    tornaInizio: "Torna alla pagina iniziale",
  },

  bacheca: {
    titolo: "Bacheca",
    prossimeScadenze: "Prossime scadenze",
    nessunaScadenza: "Nessuna scadenza in arrivo. Bene così!",
    ultimeNovita: "Ultime novità",
    vuotaTitolo: "Ancora nessun avviso",
    vuotaTesto:
      "Quando il rappresentante pubblica qualcosa, lo vedi qui.",
    vuotaTestoRep:
      "Pubblica il primo avviso: i genitori lo troveranno qui.",
    nuovoPost: "Pubblica",
    fissato: "In evidenza",
    archiviati: "Mostra anche gli archiviati",
    soloAttivi: "Nascondi gli archiviati",
    filtroTutti: "Tutti",
    entroIl: "Entro",
    eliminato: "Contenuto eliminato dalla bacheca.",
    chiuso: "Chiuso",
    chiudeIl: "Puoi votare fino a",
    archiviato: "Archiviato",
  },

  postTypes: {
    notice: "Avviso",
    deadline: "Scadenza",
    poll: "Sondaggio",
    material: "Materiale",
  },

  nuovo: {
    titolo: "Cosa vuoi pubblicare?",
    noticeSpiega: "Una comunicazione da leggere. Es. “Venerdì niente mensa”.",
    deadlineSpiega: "Qualcosa da fare entro una data. Es. “Moduli entro il 12”.",
    pollSpiega: "Una domanda con opzioni. I genitori votano in modo anonimo.",
    materialSpiega: "Cosa portare o comprare, con foto se serve.",
    titoloLabel: "Titolo",
    titoloEsempio: "Es. Consegna moduli mensa",
    testoLabel: "Testo",
    testoEsempio: "Scrivi qui i dettagli…",
    testoSpiegaMateriale: "Elenca cosa serve, una cosa per riga se puoi.",
    dataLabel: "Entro quando?",
    fotoLabel: "Foto (facoltativa)",
    fotoSpiega: "Puoi fotografare la circolare o il materiale. Massimo 5 MB.",
    fotoErroreTipo: "Puoi caricare solo foto (JPG o PNG).",
    fotoErroreDimensione: "La foto è troppo grande: massimo 5 MB.",
    domandaLabel: "Domanda del sondaggio",
    domandaEsempio: "Es. Che regalo facciamo alla maestra?",
    opzioniLabel: "Opzioni di risposta",
    opzioneEsempio: "Scrivi un'opzione…",
    aggiungiOpzione: "Aggiungi un'opzione",
    rimuoviOpzione: "Togli",
    chiusuraLabel: "Fino a quando si può votare?",
    pubblica: "Pubblica",
    erroreTitolo: "Scrivi un titolo: aiuta i genitori a capire subito di cosa si tratta.",
    erroreData: "Scegli una data valida, da oggi in poi.",
    erroreOpzioni: "Servono almeno 2 opzioni di risposta.",
    erroreChiusura: "Scegli fino a quando si può votare: una data da oggi in poi.",
  },

  fatto: {
    titolo: "Fatto! Ora avvisa i genitori",
    testo:
      "Copia il messaggio qui sotto e incollalo nel gruppo WhatsApp della classe. Contiene già il link.",
    vaiAlPost: "Vedi come lo vedranno i genitori",
    tornaBacheca: "Torna alla bacheca",
  },

  dettaglio: {
    pubblicatoDa: "Pubblicato da",
    il: "il",
    modificatoIl: "Modificato il",
    modifica: "Modifica",
    aggiornato: "Modifiche salvate. I genitori vedono la versione nuova.",
    fissa: "Metti in evidenza",
    togliFissa: "Togli dall'evidenza",
    archivia: "Archivia",
    ripristina: "Riporta in bacheca",
    archiviaConfermaTitolo: "Vuoi archiviare?",
    archiviaConfermaTesto:
      "I genitori non lo vedranno più in bacheca. Potrai sempre ripristinarlo.",
    archiviaSi: "Sì, archivia",
    archiviaNo: "No, torna indietro",
    eliminaPost: "Elimina",
    eliminaPostTitolo: "Vuoi eliminare per sempre?",
    eliminaPostTesto:
      "Sparisce dalla bacheca per tutti e non si può recuperare. Se vuoi solo nasconderlo, usa Archivia.",
    eliminaPostSi: "Sì, elimina per sempre",
    eliminaPostNo: "No, torna indietro",
    nonTrovatoTitolo: "Contenuto non trovato",
    nonTrovatoTesto:
      "Forse è stato rimosso, oppure il link è sbagliato. Controlla il link o chiedi al rappresentante.",
  },

  modificaPost: {
    titolo: "Modifica",
    spiega:
      "Il link WhatsApp resta lo stesso: chi lo apre vedrà la versione aggiornata.",
    sondaggioNota:
      "Di un sondaggio puoi cambiare solo titolo e testo. Le opzioni di risposta non si toccano: qualcuno potrebbe aver già votato.",
    salva: "Salva le modifiche",
  },

  sondaggio: {
    vota: "Vota",
    votaSpiega: "Il voto è anonimo. Puoi scegliere più di una risposta.",
    risultati: "Risultati",
    voti: "voti",
    voto: "voto",
    haiVotato: "Hai votato. Ecco i risultati finora:",
    chiusoTesto: "Il sondaggio è chiuso. Ecco i risultati:",
    chiudiOra: "Chiudi il sondaggio adesso",
    chiudiConfermaTitolo: "Vuoi chiudere il sondaggio?",
    chiudiConfermaTesto:
      "Nessuno potrà più votare. I risultati restano visibili a tutti.",
    chiudiSi: "Sì, chiudi",
    chiudiNo: "No, torna indietro",
    erroreNessunaOpzione: "Scegli almeno una risposta prima di votare.",
    erroreChiuso: "Il sondaggio è chiuso: non è più possibile votare.",
    erroreGiaVotato: "Hai già votato in questo sondaggio.",
    nonAncoraVotato:
      "I risultati si vedono dopo aver votato.",
  },

  richieste: {
    titoloGenitore: "Scrivi al rappresentante",
    spiegaGenitore:
      "Serve per proporre o segnalare qualcosa. Il rappresentante deciderà se pubblicarlo per tutti.",
    testoLabel: "La tua richiesta",
    testoEsempio: "Es. Si può rimandare la gita? Molti bambini sono malati.",
    invia: "Invia al rappresentante",
    inviata:
      "Richiesta inviata. Il rappresentante la leggerà e deciderà come procedere.",
    limiteRaggiunto:
      "Hai già inviato 5 richieste nelle ultime 24 ore. Aspetta domani per inviarne altre.",
    erroreTesto: "Scrivi la tua richiesta prima di inviarla.",
    titoloRep: "Richieste dei genitori",
    vuoteRep: "Nessuna richiesta da leggere. Tutto in ordine!",
    da: "Da",
    trasformaAvviso: "Trasforma in avviso",
    trasformaSondaggio: "Trasforma in sondaggio",
    archiviaRichiesta: "Archivia",
    gestita: "Gestita",
    tueRichieste: "Le tue richieste inviate",
    statoInviata: "Inviata",
    statoGestita: "Pubblicata in bacheca",
    statoArchiviata: "Letta e archiviata",
    vediPost: "Vedi in bacheca",
    richiesteGestite: "Richieste già gestite",
  },

  approvazioni: {
    titolo: "Richieste di iscrizione",
    banner:
      "Se non riconosci il richiedente, chiedi in chat prima di approvare. In caso di dubbio, rifiuta e chiedi di riprovare.",
    vuote: "Nessuna richiesta in attesa. Tutto fatto!",
    nota: "Nota",
    nessunaNota: "Nessuna nota",
    richiestaIl: "Richiesta del",
    approva: "Approva",
    rifiuta: "Rifiuta",
    rifiutaTitolo: "Vuoi rifiutare questa richiesta?",
    rifiutaMotivoLabel: "Motivo (facoltativo, lo leggerà il genitore)",
    rifiutaMotivoEsempio: "Es. Non ti riconosco: scrivimi in chat e riprova.",
    rifiutaConferma: "Sì, rifiuta",
    approvato: "approvato. Riceverà un'email con il link della bacheca.",
    rifiutato: "rifiutato. Riceverà un'email con il motivo.",
  },

  membri: {
    titolo: "Genitori della classe",
    rappresentante: "Rappresentante",
    silenziato: "Silenziato",
    silenzia: "Silenzia",
    riattiva: "Riattiva",
    silenziaSpiega:
      "Un genitore silenziato può leggere tutto ma non può votare né inviare richieste.",
    rimuovi: "Rimuovi dalla classe",
    rimuoviTitolo: "Vuoi rimuovere questo genitore?",
    rimuoviTesto:
      "Non potrà più vedere la bacheca. Riceverà un'email. Potrà chiedere di rientrare con il codice classe.",
    rimuoviSi: "Sì, rimuovi",
    rimuoviNo: "No, torna indietro",
  },

  impostazioni: {
    titolo: "Impostazioni",
    codiceClasse: "Codice classe",
    codiceSpiega:
      "Dallo ai genitori che devono entrare. Puoi stamparlo con le istruzioni.",
    stampaFoglio: "Stampa il foglio per i genitori",
    approvazioniLink: "Richieste di iscrizione",
    membriLink: "Genitori della classe",
    inAttesaBadge: "in attesa",
  },

  stampa: {
    titolo: "Benvenuti su ClasseHub",
    perLaClasse: "Per la classe",
    istruzioniTitolo: "Come entrare (2 minuti)",
    passo1: "Vai su questo indirizzo dal telefono:",
    passo2: "Premi “Entra in una classe” e scrivi questo codice:",
    passo3:
      "Scrivi nome, cognome e la tua email. Poi apri l'email che ricevi e premi il pulsante.",
    passo4:
      "Aspetta l'approvazione del rappresentante. Ti arriverà un'email quando sei dentro.",
    emergenzaTitolo: "Codice di emergenza (solo per il rappresentante)",
    emergenzaTesto:
      "Serve per passare il ruolo di rappresentante a un altro genitore se tu non puoi più farlo. Conserva questo foglio in un posto sicuro: il codice non verrà mai più mostrato.",
    emergenzaGiaVisto:
      "Il codice di emergenza è stato mostrato al momento della creazione della classe. Se l'hai perso, contatta l'assistenza.",
    stampa: "Stampa questo foglio",
  },

  cassa: {
    titolo: "Cassa",
    spiegaGenitore:
      "Qui vedi i soldi che hai versato nella cassa della classe e per cosa sono stati usati.",
    spiegaRep:
      "Registra i soldi ricevuti e spesi in contanti. I genitori vedono solo la propria quota.",
    saldoCassa: "In cassa adesso",
    tuaQuota: "La tua quota",
    quotaPositiva: "Disponibili per le prossime spese.",
    quotaNegativa: "Da versare al rappresentante.",
    quotaZero: "Non hai soldi in cassa al momento.",
    tuoiMovimenti: "I tuoi movimenti",
    nessunMovimentoTuo:
      "Ancora nessun movimento. Quando versi qualcosa o partecipi a una spesa, lo vedi qui.",
    movimentiCassa: "Tutti i movimenti della cassa",
    nessunMovimento:
      "La cassa è ancora vuota. I movimenti compariranno qui.",
    versamento: "Versamento",
    spesa: "Spesa",
    inContanti: "in contanti",
    partecipante: "partecipante",
    partecipanti: "partecipanti",
    aTesta: "a testa",

    // Rappresentante: registra movimenti
    registraTitolo: "Registra un movimento",
    registraVersamento: "Segna un versamento",
    registraVersamentoSpiega:
      "Un genitore ti ha dato dei soldi in contanti.",
    registraSpesa: "Segna una spesa",
    registraSpesaSpiega:
      "Hai speso soldi della cassa. Scegli chi partecipa: la quota viene tolta solo a loro.",
    genitoreLabel: "Chi ha versato?",
    genitoreScegli: "Scegli il genitore…",
    importoLabel: "Importo in euro",
    importoEsempio: "Es. 12,50",
    causaleVersamentoLabel: "Per cosa? (facoltativo)",
    causaleVersamentoEsempio: "Es. Quota gita a Verona",
    causaleVersamentoDefault: "Versamento in cassa",
    causaleSpesaLabel: "Per cosa hai speso?",
    causaleSpesaEsempio: "Es. Regalo per la maestra",
    importoATestaLabel: "Importo a testa, in euro",
    partecipantiLabel: "Chi partecipa a questa spesa?",
    tuttiPartecipanti: "Seleziona tutti",
    nessunPartecipante: "Togli tutti",
    totaleSpesa: "Totale spesa",
    registra: "Registra",
    registrato: "Movimento registrato.",
    elimina: "Elimina",
    modificaSpesa: "Modifica",
    modificaSpesaTitolo: "Modifica la spesa",
    modificaSpesaSpiega:
      "Correggi causale, importo o partecipanti: le quote di tutti si ricalcolano da sole.",
    spesaAggiornata: "Spesa aggiornata.",
    spesaNonTrovata:
      "Questa spesa non esiste più o non si può modificare. Torna alla cassa e controlla.",

    // Filtri
    filtroTutti: "Tutti",
    filtroVersamenti: "Versamenti",
    filtroSpese: "Spese",
    filtroGenitoreLabel: "Vedi un solo genitore",
    filtroGenitoreTutti: "Tutti i genitori",
    filtra: "Filtra",
    nessunRisultatoFiltro:
      "Nessun movimento con questi filtri. Prova a togliere un filtro.",

    // Promemoria WhatsApp
    promemoriaTitolo: "Chiedi i versamenti su WhatsApp",
    promemoriaSpiega:
      "Puoi modificare il testo come preferisci, poi copialo e incollalo nel gruppo. Ogni genitore, aprendo il link, vede la propria quota e decide se e quanto versare.",
    waTitolo: "CASSA DI CLASSE",
    waServono: "Servono nuovi versamenti",
    waTesto:
      "Apri il link, controlla la tua quota e, se puoi, fai un versamento (con carta oppure in contanti al rappresentante).",
    waLink: "Controlla la tua quota qui:",

    // Export
    esporta: "Scarica i movimenti (Excel)",
    esportaSpiegaRep:
      "Un file con tutti i versamenti e le spese, una riga per ogni quota. Si apre con Excel o Google Fogli.",
    esportaSpiegaGenitore:
      "Un file con i tuoi movimenti e le causali. Si apre con Excel o Google Fogli.",
    csvData: "Data",
    csvTipo: "Tipo",
    csvCausale: "Causale",
    csvGenitore: "Genitore",
    csvQuota: "Quota in euro",
    csvTotale: "Totale movimento in euro",
    csvOrigine: "Origine",
    csvContanti: "Contanti",

    eliminaTitolo: "Vuoi eliminare questo movimento?",
    eliminaTesto:
      "Le quote dei genitori verranno ricalcolate come se non fosse mai esistito. Se era giusto, dovrai reinserirlo.",
    eliminaSi: "Sì, elimina",
    eliminaNo: "No, torna indietro",
    saldiTitolo: "Quote dei genitori",
    saldiSpiega:
      "Quanto ha in cassa ogni genitore. In rosso chi deve ancora versare.",

    // Errori
    erroreGenitore: "Scegli il genitore che ha versato.",
    erroreImporto:
      "Scrivi un importo valido in euro, ad esempio 12,50. Massimo 5.000 euro.",
    erroreCausale: "Scrivi per cosa hai speso: aiuta i genitori a capire.",
    errorePartecipanti: "Scegli almeno un genitore che partecipa alla spesa.",
  },

  account: {
    titolo: "Il tuo account",
    leTueClassi: "Le tue classi",
    nessunaClasse: "Non fai ancora parte di nessuna classe.",
    entraInClasse: "Entra in una classe",
    esciConferma: "Esci dall'account",
  },

  email: {
    approvatoOggetto: "Sei dentro! La tua richiesta è stata approvata",
    approvatoTesto: (className: string, link: string) =>
      `Il rappresentante ti ha approvato: ora fai parte della classe ${className}.\nApri la bacheca da qui: ${link}`,
    rifiutatoOggetto: "La tua richiesta non è stata approvata",
    rifiutatoTesto: (className: string, reason: string | null) =>
      `Il rappresentante non ha approvato la tua richiesta per la classe ${className}.` +
      (reason ? `\nMotivo: ${reason}` : "") +
      `\nSe pensi sia un errore, parla direttamente con il rappresentante e riprova.`,
    rimossoOggetto: "Non fai più parte della classe",
    rimossoTesto: (className: string) =>
      `Il rappresentante ti ha rimosso dalla classe ${className}. Se pensi sia un errore, parla direttamente con il rappresentante.`,
    magicLinkOggetto: "Il tuo link per entrare su ClasseHub",
    magicLinkTesto: (link: string) =>
      `Premi qui per continuare su ClasseHub: ${link}\nSe non hai richiesto tu questa email, ignorala.`,
  },

  whatsapp: {
    dettagli: "Dettagli e come procedere:",
    votaQui: "Vota qui:",
    entro: "Entro",
  },

  errori: {
    nonAutorizzato:
      "Non puoi fare questa operazione. Se pensi sia un errore, esci ed entra di nuovo.",
    soloRappresentante: "Solo il rappresentante può fare questa operazione.",
    silenziato:
      "Il rappresentante ha disattivato temporaneamente la tua possibilità di votare e inviare richieste. Puoi continuare a leggere la bacheca.",
    classeNonTrovata:
      "Questa classe non esiste o non ne fai parte. Controlla il link.",
    paginaNonTrovata: "Questa pagina non esiste. Controlla il link.",
  },
} as const;

export type It = typeof it;
