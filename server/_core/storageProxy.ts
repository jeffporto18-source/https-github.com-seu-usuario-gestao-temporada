import type { Express, Request, Response } from "express";
import { getPresignedUrl } from "../storage";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: Request, res: Response) => {
    const key = req.params[0];
    try {
      const url = await getPresignedUrl(key);
      res.redirect(302, url);
    } catch (error) {
      res.status(404).json({ error: "Arquivo não encontrado." });
    }
  });
}
