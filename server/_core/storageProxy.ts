import type { Express } from "express";
import express from "express";
import { uploadsDir } from "../storage";

export function registerStorageProxy(app: Express) {
  app.use("/manus-storage", express.static(uploadsDir()));
}
