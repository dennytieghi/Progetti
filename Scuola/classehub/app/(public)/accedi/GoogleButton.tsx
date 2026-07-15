"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/db/supabase-browser";
import { it } from "@/lib/i18n/it";

/** Parte il giro OAuth: Google → Supabase → il nostro callback. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  async function accediConGoogle() {
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?intent=login`,
      },
    });
    if (error) setLoading(false);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      onClick={accediConGoogle}
      disabled={loading}
    >
      {loading ? it.common.caricamento : it.accedi.google}
    </Button>
  );
}
