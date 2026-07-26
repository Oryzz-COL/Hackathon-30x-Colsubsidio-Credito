import { z } from "zod";
import { MAX_QUERY_LENGTH } from "@/lib/chispy/guardrails";

const auditEventSchema = z.object({
  id: z.string().max(120),
  action: z.string().max(80),
  actor: z.string().max(120),
  detail: z.string().max(500),
  createdAt: z.string().datetime(),
});

export const chispyRequestSchema = z.object({
  query: z.string().trim().min(2).max(MAX_QUERY_LENGTH),
  audit: z.array(auditEventSchema).max(100).optional(),
});
