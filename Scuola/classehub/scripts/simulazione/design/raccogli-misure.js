// Raccoglitore di misure UI: si esegue DENTRO la pagina (console o tool
// browser) e ritorna un JSON con le misure oggettive della schermata.
// Conta i pixel renderizzati, non il codice: quello che vede l'utente.
(() => {
  const luminanza = (r, g, b) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const parseColore = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null;
  };
  const sfondoEffettivo = (el) => {
    let nodo = el;
    while (nodo && nodo !== document.documentElement) {
      const c = parseColore(getComputedStyle(nodo).backgroundColor || "");
      if (c && c.a > 0.9) return c;
      nodo = nodo.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const contrasto = (fg, bg) => {
    const l1 = luminanza(fg.r, fg.g, fg.b);
    const l2 = luminanza(bg.r, bg.g, bg.b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const visibile = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.1;
  };

  // --- Testo: dimensioni, interlinea, contrasto (sui nodi foglia con testo).
  const testo = { totale: 0, corpoOk: 0, microOk: 0, sotto15: 0, lhOk: 0, lhTot: 0, AAA: 0, AA: 0, sottoAA: 0, casiSotto: [] };
  const foglie = [...document.querySelectorAll("body *")].filter(
    (el) => visibile(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
  );
  for (const el of foglie) {
    const s = getComputedStyle(el);
    const px = parseFloat(s.fontSize);
    testo.totale++;
    if (px >= 17) testo.corpoOk++;
    else if (px >= 15) testo.microOk++;
    else testo.sotto15++;
    if (el.tagName === "P" || px >= 17) {
      testo.lhTot++;
      const lh = parseFloat(s.lineHeight);
      if (!Number.isNaN(lh) && lh / px >= 1.45) testo.lhOk++;
    }
    const fg = parseColore(s.color);
    if (fg) {
      const c = contrasto(fg, sfondoEffettivo(el));
      const grande = px >= 24 || (px >= 18.5 && +s.fontWeight >= 700);
      if (c >= 7 || (grande && c >= 4.5)) testo.AAA++;
      else if (c >= 4.5 || (grande && c >= 3)) testo.AA++;
      else {
        testo.sottoAA++;
        if (testo.casiSotto.length < 6)
          testo.casiSotto.push({ testo: el.textContent.trim().slice(0, 40), px, contrasto: Math.round(c * 10) / 10 });
      }
    }
  }

  // --- Bersagli tattili.
  const target = { totale: 0, ok48: 0, quasi44: 0, sotto44: 0, casiPiccoli: [] };
  const interattivi = [...document.querySelectorAll("a, button, input, select, textarea, [role=button]")].filter(visibile);
  for (const el of interattivi) {
    const r = el.getBoundingClientRect();
    const latoMin = Math.min(r.width, r.height);
    target.totale++;
    if (latoMin >= 48) target.ok48++;
    else if (latoMin >= 44) target.quasi44++;
    else {
      target.sotto44++;
      if (target.casiPiccoli.length < 6)
        target.casiPiccoli.push({ testo: (el.textContent || el.getAttribute("aria-label") || el.type || "?").trim().slice(0, 40), lato: Math.round(latoMin) });
    }
  }

  // --- Azioni simultanee e CTA in evidenza (i link-card di lista non contano).
  const bottoni = interattivi.filter((el) => el.tagName === "BUTTON" || el.getAttribute("role") === "button");
  const ctaEvidenti = bottoni.filter((el) => {
    const r = el.getBoundingClientRect();
    const bg = parseColore(getComputedStyle(el).backgroundColor || "");
    return r.width > window.innerWidth * 0.6 && bg && bg.a > 0.9 && luminanza(bg.r, bg.g, bg.b) < 0.45;
  });

  // --- Gergo vietato nel testo visibile.
  const corpo = document.body.innerText.toLowerCase();
  const gergo = ["login", "logout", "submit", "dashboard", "error", "admin", "password", "username", "feature", "cancel"]
    .filter((p) => new RegExp(`\\b${p}\\b`).test(corpo));

  // --- Extra inclusione.
  const inputs = [...document.querySelectorAll("input:not([type=hidden]), textarea, select")].filter(visibile);
  const inputsConLabel = inputs.filter((i) => (i.id && document.querySelector(`label[for="${i.id}"]`)) || i.closest("label")).length;
  const scrollOrizzontale = document.documentElement.scrollWidth > window.innerWidth + 2;

  return JSON.stringify({
    url: location.pathname,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    testo, target,
    azioni: { bottoni: bottoni.length, ctaEvidenti: ctaEvidenti.length, interattiviTotali: interattivi.length },
    gergo,
    inputs: { totale: inputs.length, conLabel: inputsConLabel },
    scrollOrizzontale,
  });
})();
