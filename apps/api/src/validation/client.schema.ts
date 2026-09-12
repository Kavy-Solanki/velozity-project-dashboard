import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters"),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
