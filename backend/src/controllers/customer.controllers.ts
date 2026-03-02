import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/** Query params for listing customers. */
interface ListCustomersQuery {
  companyId?: string;
}

/** Request body for creating a customer. companyId scopes the customer to a company. */
interface CreateCustomerBody {
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  email?: string;
  leadSource?: string;
  address2?: string;
  notes?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * List customers for a company.
 * Requires companyId query param.
 */
export const listCustomers = async (req: Request<{}, {}, {}, ListCustomersQuery>, res: Response) => {
  try {
    const { companyId } = req.query;

    if (!companyId || typeof companyId !== "string") {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const customers = await prisma.customer.findMany({
      where: { companyId },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return res.status(200).json({
      success: true,
      message: "Customers retrieved successfully",
      customers,
    });
  } catch (error) {
    console.error("List customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Create a customer for a company.
 * Customers are scoped by companyId; each company has its own set of clients.
 */
export const createCustomer = async (req: Request<{}, {}, CreateCustomerBody>, res: Response) => {
  try {
    const {
      companyId,
      firstName,
      lastName,
      phone,
      address,
      email,
      leadSource,
      address2,
      notes,
    } = req.body;

    if (!companyId || typeof companyId !== "string") {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    if (!firstName || typeof firstName !== "string" || !firstName.trim()) {
      return res.status(400).json({
        success: false,
        message: "firstName is required",
      });
    }

    if (!lastName || typeof lastName !== "string" || !lastName.trim()) {
      return res.status(400).json({
        success: false,
        message: "lastName is required",
      });
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "phone is required",
      });
    }

    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: "address is required",
      });
    }

    if (email !== undefined && email !== null && email !== "") {
      const trimmedEmail = typeof email === "string" ? email.trim() : "";
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const trimmedPhone = phone.trim();
    const existingCustomer = await prisma.customer.findFirst({
      where: { companyId, phone: trimmedPhone },
    });

    if (existingCustomer) {
      return res.status(409).json({
        success: false,
        message: "A customer with this phone number already exists for this company",
      });
    }

    const customer = await prisma.customer.create({
      data: {
        companyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: trimmedPhone,
        address: address.trim(),
        ...(email !== undefined && email !== null && email !== "" && { email: String(email).trim() }),
        ...(leadSource !== undefined && leadSource !== null && leadSource !== "" && { leadSource: String(leadSource).trim() }),
        ...(address2 !== undefined && address2 !== null && address2 !== "" && { address2: String(address2).trim() }),
        ...(notes !== undefined && notes !== null && notes !== "" && { notes: String(notes).trim() }),
      },
      include: { company: true },
    });

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      customer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
