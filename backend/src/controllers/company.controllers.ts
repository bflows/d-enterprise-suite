import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const createCompany = async (req: Request, res: Response) => {
  try {
    const { name, industry } = req.body;

    if (!name || !industry) {
      return res.status(401).json({
        success: false,
        message: "Business name and industry are required"
      });
    }

    const existingCompany = await prisma.company.findFirst({
      where: { name }
    });

    if (existingCompany) {
      return res.status(401).json({
        success: false,
        message: "Company already exists"
      });
    }

    const defaultRoles = [
      { name: "Employee", slug: "employee" },
      { name: "Technician", slug: "technician" },
      { name: "Dispatcher", slug: "dispatcher" },
      { name: "Admin", slug: "admin" }
    ];

    const newCompany = await prisma.company.create({
      data: {
        name: name,
        industry: industry,
        roles: {
          create: defaultRoles
        }
      },
      include: { roles: true }
    });

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      newCompany
    });
  } catch (error) {
    console.error("Create company error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

const VALID_ROLE_SLUGS = ["employee", "technician", "dispatcher", "admin"] as const;

export const addEmployee = async (req: Request, res: Response) => {
  try {
    const { userId, companyId, roleSlug = 'employee' } = req.body;

    if (!userId || !companyId) {
      return res.status(400).json({
        success: false,
        message: "userId and companyId are required"
      });
    }

    if (!VALID_ROLE_SLUGS.includes(roleSlug)) {
      return res.status(400).json({
        success: false,
        message: `roleSlug must be one of: ${VALID_ROLE_SLUGS.join(", ")}`
      });
    }

    const [user, company, roleExists] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.role.findFirst({ where: { companyId, slug: roleSlug } })
    ]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }
    if (!roleExists) {
      return res.status(404).json({
        success: false,
        message: `Role '${roleSlug}' not found for this company`
      });
    }

    const existing = await prisma.employee.findFirst({
      where: {
        userId,
        companyId,
        role: { slug: roleSlug }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "User is already assigned this role in this company"
      });
    }

    const employee = await prisma.employee.create({
      data: { userId, companyId, roleSlug },
      include: { user: true, company: true, role: true }
    });

    return res.status(201).json({
      success: true,
      message: "Employee added successfully",
      employee
    });
  } catch (error) {
    console.error("Add employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

