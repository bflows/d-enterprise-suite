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

const SERVICE_ITEM_TYPES = ["SERVICE", "ADDON"] as const;

export const createServiceItem = async (req: Request, res: Response) => {
  try {
    const { categoryId, type, title, description, price, duration, unit } = req.body;

    if (!categoryId || !type || !title || description == null || price == null || duration == null || unit == null) {
      return res.status(400).json({
        success: false,
        message: "categoryId, type, title, description, price, duration, and unit are required"
      });
    }

    if (!SERVICE_ITEM_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be SERVICE or ADDON"
      });
    }

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    if (!trimmedTitle) {
      return res.status(400).json({
        success: false,
        message: "Title cannot be empty"
      });
    }

    const category = await prisma.serviceBookCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const unitNum = typeof unit === "string" ? parseInt(unit, 10) : Number(unit);
    if (!Number.isInteger(unitNum) || unitNum < 0) {
      return res.status(400).json({
        success: false,
        message: "unit must be a non-negative integer"
      });
    }

    const priceInt = typeof price === "string" ? parseInt(price, 10) : Number(price);
    if (!Number.isInteger(priceInt) || priceInt < 0) {
      return res.status(400).json({
        success: false,
        message: "price must be a non-negative integer"
      });
    }

    const durationInt = typeof duration === "string" ? parseInt(duration, 10) : Number(duration);
    if (!Number.isInteger(durationInt) || durationInt < 0) {
      return res.status(400).json({
        success: false,
        message: "duration must be a non-negative integer"
      });
    }

    const serviceItem = await prisma.serviceItem.create({
      data: {
        categoryId,
        type,
        title: trimmedTitle,
        description: String(description),
        price: priceInt,
        duration: durationInt,
        unit: unitNum
      }
    });

    return res.status(201).json({
      success: true,
      message: "Service item created successfully",
      serviceItem
    });
  } catch (error) {
    console.error("Create service item error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

export const getServiceItemsByCategoryId = async (req: Request, res: Response) => {
  try {
    const categoryId = typeof req.query.categoryId === "string" ? req.query.categoryId : "";

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId is required"
      });
    }

    const category = await prisma.serviceBookCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const serviceItems = await prisma.serviceItem.findMany({
      where: { categoryId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });

    return res.status(200).json({
      success: true,
      message: "Service items fetched successfully",
      serviceItems
    });
  } catch (error) {
    console.error("Get service items by category error", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};