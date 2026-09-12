import { z } from "zod";

export const catchupQuerySchema = z
  .object({
    since: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format for since" })
      .optional(),
    lastId: z.string().min(1).optional(),
    limit: z.coerce.number().min(1).max(50).default(20),
  })
  .refine(({ since, lastId }) => Boolean(since) === Boolean(lastId), {
    message: "since and lastId must be provided together",
    path: ["lastId"],
  });

export type CatchupQuery = z.infer<typeof catchupQuerySchema>;
