import { prisma } from "../prisma.js";
import { CreateClientInput } from "../validation/client.schema.js";

export class ClientService {
  async listClients() {
    return prisma.client.findMany({
      include: {
        _count: {
          select: { projects: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  async createClient(input: CreateClientInput) {
    return prisma.client.create({
      data: { name: input.name },
    });
  }
}

export const clientService = new ClientService();
