import type { Request, Response } from 'express';

export const registerUser = async (_req: Request, res: Response) => {
  try {
    res.status(201).json({ success: true, message: "Register endpoint hit!" });
  } catch (error) {
    console.error("Test Error:", error);
    res.status(500).json({ success: false, message: "Register endpoint failed!" });
  }
};