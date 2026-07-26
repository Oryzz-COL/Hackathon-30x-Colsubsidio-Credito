import { z } from "zod";
import { ENRICHMENT_BATCH_LIMIT } from "@/lib/enrichment/batch";

export const enrichmentConsentSchema = z.object({
  socialDemo: z.boolean(),
  lifeEvents: z.boolean(),
  authorizedFinancial: z.boolean(),
  commercialContact: z.boolean(),
});

const documentSchema = z.string()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(6).max(12));

export const enrichmentRequestSchema = z.object({
  documentNumber: documentSchema.optional(),
  documents: z.array(documentSchema).min(1).max(ENRICHMENT_BATCH_LIMIT).optional(),
  consent: enrichmentConsentSchema,
}).superRefine((value, context) => {
  const modes = Number(Boolean(value.documentNumber)) + Number(Boolean(value.documents));
  if (modes !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["documentNumber"],
      message: "Envía una cédula o un lote, no ambos.",
    });
  }
});

export type EnrichmentApiInput = z.infer<typeof enrichmentRequestSchema>;
