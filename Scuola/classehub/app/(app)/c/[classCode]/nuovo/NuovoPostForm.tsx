"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/shared/Banner";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/upload-limits";
import type { PostType } from "@/lib/db/types";
import {
  creaAvvisoAction,
  creaMaterialeAction,
  creaScadenzaAction,
  creaSondaggioAction,
} from "./actions";

const ACTIONS = {
  notice: creaAvvisoAction,
  deadline: creaScadenzaAction,
  material: creaMaterialeAction,
  poll: creaSondaggioAction,
} as const;

export function NuovoPostForm({
  classCode,
  tipo,
  defaultBody,
  requestId,
}: {
  classCode: string;
  tipo: PostType;
  defaultBody: string;
  requestId: string;
}) {
  const [state, formAction] = useActionState(ACTIONS[tipo], initialFormState);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  // Controllo subito nel browser: le Server Action rifiutano gli invii
  // troppo grandi con un errore grezzo, quindi un file fuori misura
  // non deve nemmeno partire. Il file scartato viene tolto dal campo.
  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoError(null);
      return;
    }
    if (!ALLOWED_PHOTO_TYPES[file.type]) {
      setPhotoError(it.nuovo.fotoErroreTipo);
      e.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(it.nuovo.fotoErroreDimensione);
      e.target.value = "";
      return;
    }
    setPhotoError(null);
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}

      <input type="hidden" name="classCode" value={classCode} />
      <input type="hidden" name="requestId" value={requestId} />

      <div>
        <Label htmlFor="title">
          {tipo === "poll" ? it.nuovo.domandaLabel : it.nuovo.titoloLabel}
        </Label>
        <Input
          id="title"
          name="title"
          placeholder={tipo === "poll" ? it.nuovo.domandaEsempio : it.nuovo.titoloEsempio}
          maxLength={120}
          required
        />
      </div>

      <div>
        <Label htmlFor="body">{it.nuovo.testoLabel}</Label>
        <Textarea
          id="body"
          name="body"
          placeholder={it.nuovo.testoEsempio}
          defaultValue={defaultBody}
          maxLength={5000}
        />
        {tipo === "material" && (
          <p className="mt-1.5 text-[15px] text-ink-soft">
            {it.nuovo.testoSpiegaMateriale}
          </p>
        )}
      </div>

      {tipo === "deadline" && (
        <div>
          <Label htmlFor="dueDate">{it.nuovo.dataLabel}</Label>
          <Input id="dueDate" name="dueDate" type="date" min={today} required />
        </div>
      )}

      {tipo === "material" && (
        <div>
          <Label htmlFor="photo">{it.nuovo.fotoLabel}</Label>
          <Input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png"
            className="py-2.5"
            onChange={onPhotoChange}
          />
          {photoError && (
            <div aria-live="assertive" className="mt-2">
              <Banner tone="danger">{photoError}</Banner>
            </div>
          )}
          <p className="mt-1.5 text-[15px] text-ink-soft">{it.nuovo.fotoSpiega}</p>
        </div>
      )}

      {tipo === "poll" && (
        <>
          <fieldset>
            <legend className="mb-1.5 block font-semibold text-ink">
              {it.nuovo.opzioniLabel}
            </legend>
            <div className="space-y-2">
              {options.map((value, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    name="options"
                    value={value}
                    onChange={(e) =>
                      setOptions(options.map((o, j) => (j === i ? e.target.value : o)))
                    }
                    placeholder={it.nuovo.opzioneEsempio}
                    aria-label={`${it.nuovo.opzioniLabel} ${i + 1}`}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setOptions(options.filter((_, j) => j !== i))}
                    >
                      {it.nuovo.rimuoviOpzione}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2"
                onClick={() => setOptions([...options, ""])}
              >
                + {it.nuovo.aggiungiOpzione}
              </Button>
            )}
          </fieldset>

          <div>
            <Label htmlFor="closesAt">{it.nuovo.chiusuraLabel}</Label>
            <Input id="closesAt" name="closesAt" type="date" min={today} required />
          </div>
        </>
      )}

      <SubmitButton>{it.nuovo.pubblica}</SubmitButton>
    </form>
  );
}
