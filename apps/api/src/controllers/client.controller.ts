import { Request, Response, NextFunction } from "express";
import { clientService } from "../services/client.service.js";

export class ClientController {
  async listClients(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clients = await clientService.listClients();
      res.status(200).json({ data: clients });
    } catch (err) {
      next(err);
    }
  }

  async createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const client = await clientService.createClient(req.body);
      res.status(201).json({ data: client });
    } catch (err) {
      next(err);
    }
  }
}

export const clientController = new ClientController();
