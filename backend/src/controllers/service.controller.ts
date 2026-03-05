import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const createServiceBook = async (req: Request, res: Response) => {
  try {
    const { companyId, name } = req.body;

    if (!companyId || !name) {
      return res.status(400).json({
        success: false,
        message: "companyId and name are required"
      });
    }

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Service book name cannot be empty"
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const serviceBook = await prisma.serviceBook.create({
      data: {
        companyId,
        name: trimmedName
      }
    });

    return res.status(201).json({
      success: true,
      message: "Service book created successfully",
      serviceBook
    });
  } catch (error) {
    console.error("Create service book error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

export const getServiceBooks = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.body;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required"
      });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    const serviceBooks = await prisma.serviceBook.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: {
        catories: { orderBy: { sortOrder: "asc" } }
      }
    });

    return res.status(200).json({
      success: true,
      message: "Service books fetched successfully",
      serviceBooks
    });
  } catch (error) {
    console.error("Get service books error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { serviceBookId, name } = req.body;

    if (!serviceBookId || !name) {
      return res.status(400).json({
        success: false,
        message: "serviceBookId and name are required"
      });
    }

    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message: "Category name cannot be empty"
      });
    }

    const serviceBook = await prisma.serviceBook.findUnique({
      where: { id: serviceBookId }
    });

    if (!serviceBook) {
      return res.status(404).json({
        success: false,
        message: "Service book not found"
      });
    }

    const category = await prisma.serviceBookCategory.create({
      data: {
        serviceBookId,
        name: trimmedName
      }
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("Create category error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};