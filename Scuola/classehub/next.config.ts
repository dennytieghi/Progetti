import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Di default le Server Action rifiutano invii sopra 1 MB con un
    // errore grezzo che blocca la pagina: qualsiasi foto da telefono
    // lo superava. 8 MB lascia spazio al limite nostro di 5 MB
    // (lib/upload-limits.ts) più l'overhead del form, così i file
    // tra 5 e 8 MB ricevono il messaggio gentile dal server invece
    // del crash. Il form blocca comunque tutto già nel browser.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
