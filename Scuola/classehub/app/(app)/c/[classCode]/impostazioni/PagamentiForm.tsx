"use client";

import { useActionState } from "react";
import { Banner } from "@/components/shared/Banner";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { initialFormState } from "@/lib/form-state";
import { it } from "@/lib/i18n/it";
import { salvaCoordinatePagamentoAction } from "./actions";

export interface CoordsDefaults {
  iban: string;
  ibanHolder: string;
  paypal: string;
  satispay: string;
}

export function PagamentiForm({
  classCode,
  defaults,
}: {
  classCode: string;
  defaults: CoordsDefaults;
}) {
  const [state, formAction] = useActionState(
    salvaCoordinatePagamentoAction,
    initialFormState
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div aria-live="assertive">
          <Banner tone="danger">{state.error}</Banner>
        </div>
      )}
      <input type="hidden" name="classCode" value={classCode} />
      <div>
        <Label htmlFor="iban">{it.impostazioni.ibanLabel}</Label>
        <Input id="iban" name="iban" placeholder={it.impostazioni.ibanEsempio} defaultValue={defaults.iban} />
      </div>
      <div>
        <Label htmlFor="ibanHolder">{it.impostazioni.intestatarioLabel}</Label>
        <Input id="ibanHolder" name="ibanHolder" placeholder={it.impostazioni.intestatarioEsempio} maxLength={80} defaultValue={defaults.ibanHolder} />
      </div>
      <div>
        <Label htmlFor="paypal">{it.impostazioni.paypalLabel}</Label>
        <Input id="paypal" name="paypal" placeholder={it.impostazioni.paypalEsempio} defaultValue={defaults.paypal} />
      </div>
      <div>
        <Label htmlFor="satispay">{it.impostazioni.satispayLabel}</Label>
        <Input id="satispay" name="satispay" inputMode="tel" placeholder={it.impostazioni.satispayEsempio} defaultValue={defaults.satispay} />
      </div>
      <SubmitButton>{it.impostazioni.pagamentiSalva}</SubmitButton>
    </form>
  );
}
