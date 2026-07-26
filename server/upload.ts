import type { Express, Request, Response } from "express";
import multer from "multer";
import { sdk } from "./_core/sdk";
import { storagePut } from "./storage";
import * as db from "./db";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

export function registerUploadRoutes(app: Express) {
  /**
   * POST /api/upload/contrato
   * Body: multipart/form-data with field "file" (PDF) and field "propertyId" (number)
   * Returns: { contratoUrl, contratoKey }
   */
  app.post("/api/upload/contrato", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado." });
        return;
      }

      const propertyId = Number(req.body.propertyId);
      if (!propertyId) {
        res.status(400).json({ error: "propertyId é obrigatório." });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Arquivo não enviado." });
        return;
      }

      if (file.mimetype !== "application/pdf") {
        res.status(400).json({ error: "Apenas arquivos PDF são aceitos." });
        return;
      }

      // Verify property belongs to user
      const prop = await db.getProperty(user.id, propertyId);
      if (!prop) {
        res.status(404).json({ error: "Imóvel não encontrado." });
        return;
      }

      // Upload to S3
      const relKey = `contratos/prop_${propertyId}.pdf`;
      const { key, url } = await storagePut(relKey, file.buffer, "application/pdf");

      // Update property record
      await db.updateProperty(user.id, propertyId, { contratoUrl: url, contratoKey: key });

      res.json({ contratoUrl: url, contratoKey: key });
    } catch (error: any) {
      console.error("[Upload] Contract upload failed:", error);
      res.status(500).json({ error: error.message || "Erro ao fazer upload do contrato." });
    }
  });

  /**
   * POST /api/upload/documento-reserva
   * Body: multipart/form-data with field "file" (PDF ou imagem) e "reservationId" (number)
   * Documento de identificação do hóspede.
   * Returns: { documentoUrl, documentoKey }
   */
  const EXT_BY_MIME: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  app.post("/api/upload/documento-reserva", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user) {
        res.status(401).json({ error: "Não autenticado." });
        return;
      }

      const reservationId = Number(req.body.reservationId);
      if (!reservationId) {
        res.status(400).json({ error: "reservationId é obrigatório." });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Arquivo não enviado." });
        return;
      }

      const ext = EXT_BY_MIME[file.mimetype];
      if (!ext) {
        res.status(400).json({ error: "Apenas PDF ou imagens (JPG, PNG, WEBP) são aceitos." });
        return;
      }

      const reserva = await db.getReservation(user.id, reservationId);
      if (!reserva) {
        res.status(404).json({ error: "Reserva não encontrada." });
        return;
      }

      const relKey = `documentos/reserva_${reservationId}.${ext}`;
      const { key, url } = await storagePut(relKey, file.buffer, file.mimetype);

      await db.updateReservation(user.id, reservationId, { documentoUrl: url, documentoKey: key });

      res.json({ documentoUrl: url, documentoKey: key });
    } catch (error: any) {
      console.error("[Upload] Reservation document upload failed:", error);
      res.status(500).json({ error: error.message || "Erro ao fazer upload do documento." });
    }
  });
}
