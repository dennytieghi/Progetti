import { z } from "zod";
import { it } from "@/lib/i18n/it";
import { normalizeCode } from "@/lib/codes/generate";

/**
 * Schema Zod per OGNI input utente (CLAUDE.md §7).
 * I messaggi di errore sono frasi complete in italiano.
 */

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: it.creaClasse.erroreEmail });

const displayNameSchema = z
  .string()
  .trim()
  .min(2, { message: it.entra.erroreNome })
  .max(80, { message: it.entra.erroreNome });

export const createClassSchema = z.object({
  className: z
    .string()
    .trim()
    .min(2, { message: it.creaClasse.erroreNomeClasse })
    .max(80, { message: it.creaClasse.erroreNomeClasse }),
  displayName: displayNameSchema,
  email: emailSchema,
});

export const joinClassSchema = z.object({
  classCode: z
    .string()
    .transform(normalizeCode)
    .pipe(z.string().length(6, { message: it.entra.erroreCodice })),
  displayName: displayNameSchema,
  email: emailSchema,
  note: z
    .string()
    .trim()
    .max(300)
    .transform((s) => (s.length > 0 ? s : null))
    .nullable()
    .default(null),
});

const titleSchema = z
  .string()
  .trim()
  .min(2, { message: it.nuovo.erroreTitolo })
  .max(120, { message: it.nuovo.erroreTitolo });

const bodySchema = z
  .string()
  .trim()
  .max(5000)
  .transform((s) => (s.length > 0 ? s : null))
  .nullable()
  .default(null);

/** Data (YYYY-MM-DD) da oggi in poi. */
const futureDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: it.nuovo.erroreData })
  .refine((d) => d >= new Date().toISOString().slice(0, 10), {
    message: it.nuovo.erroreData,
  });

export const createNoticeSchema = z.object({
  title: titleSchema,
  body: bodySchema,
});

export const createDeadlineSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  dueDate: futureDateSchema,
});

export const createMaterialSchema = z.object({
  title: titleSchema,
  body: bodySchema,
});

export const createPollSchema = z.object({
  title: titleSchema,
  body: bodySchema,
  closesAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: it.nuovo.erroreChiusura })
    .refine((d) => d >= new Date().toISOString().slice(0, 10), {
      message: it.nuovo.erroreChiusura,
    }),
  options: z
    .array(z.string().trim().min(1).max(100))
    .min(2, { message: it.nuovo.erroreOpzioni })
    .max(10, { message: it.nuovo.erroreOpzioni }),
});

export const voteSchema = z.object({
  optionIds: z
    .array(z.string().uuid())
    .min(1, { message: it.sondaggio.erroreNessunaOpzione }),
});

export const createRequestSchema = z.object({
  body: z
    .string()
    .trim()
    .min(5, { message: it.richieste.erroreTesto })
    .max(1000, { message: it.richieste.erroreTesto }),
});

export const rejectMembershipSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(300)
    .transform((s) => (s.length > 0 ? s : null))
    .nullable()
    .default(null),
});
