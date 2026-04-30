import { NextFunction, Request, Response } from "express";
import { connectToDatabase } from "../config/database.js";

export async function connectDatabase(
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    next(err);
  }
}
