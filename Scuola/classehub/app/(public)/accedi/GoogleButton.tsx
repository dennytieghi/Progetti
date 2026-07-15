"use client";

import { useState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/db/supabase-browser";
import { it } from "@/lib/i18n/it";

/** Parte il giro OAuth: Google → Supabase → il nostro callback. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  async function accediConGoogle() {
    setErrore(null);
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=login`,
      },
    });
    if (error) {
      setErrore(it.accedi.erroreGoogle);
      setLoading(false);
    }
  }

  return (
    <>
      {errore && (
        <div aria-live="assertive">
          <Banner tone="danger">{errore}</Banner>
        </div>
      )}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={accediConGoogle}
        disabled={loading}
      >
        {loading ? it.common.caricamento : it.accedi.google}
      </Button>
    </>
  );
}
