/** Stato ritornato dalle Server Actions ai form (per useActionState). */
export interface FormState {
  error: string | null;
}

export const initialFormState: FormState = { error: null };
