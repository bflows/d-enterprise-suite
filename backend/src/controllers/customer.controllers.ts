import type { Request, Response } from "express";
import { prisma } from "../lib/prisma";

/** Query params for listing customers. */
interface ListCustomersQuery {
  companyId?: string;
}

/** Query params for searching customers in a company (by name or phone). */
interface SearchCustomersQuery {
  companyId?: string;
  q?: string;
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

/** Request body for deleting a customer. companyId is used to verify the customer belongs to the company. */
interface DeleteCustomerBody {
  id: string;
  companyId: string;
}

/** Request body for updating a customer. companyId and id required; only other provided fields are updated. */
interface UpdateCustomerBody {
  companyId: string;
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  email?: string | null;
  leadSource?: string | null;
  address2?: string | null;
  companyName?: string | null;
  notes?: string | null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Search customers for a company by name (first or last) or phone number.
 * Requires companyId query param. Optional q param filters by substring match on firstName, lastName, or phone.
 */
export const searchCustomers = async (
  req: Request<{}, {}, {}, SearchCustomersQuery>,
  res: Response
) => {
  try {
    const { companyId, q } = req.query;

    if (!companyId || typeof companyId !== "string") {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const term = typeof q === "string" ? q.trim() : "";

    const where: { companyId: string; OR?: Array<{ [k: string]: unknown }> } = {
      companyId,
    };

    if (term.length > 0) {
      where.OR = [
        { firstName: { contains: term, mode: "insensitive" } },
        { lastName: { contains: term, mode: "insensitive" } },
        { phone: { contains: term } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return res.status(200).json({
      success: true,
      message: "Customers retrieved successfully",
      customers,
    });
  } catch (error) {
    console.error("Search customers error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

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

/**
 * Update a customer.
 * Body must include companyId and customer id; only other provided fields are updated.
 */
export const updateCustomer = async (
  req: Request<{}, {}, UpdateCustomerBody>,
  res: Response
) => {
  try {
    const {
      companyId,
      id,
      firstName,
      lastName,
      phone,
      address,
      email,
      leadSource,
      address2,
      companyName,
      notes,
    } = req.body;

    if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer id is required",
      });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (existingCustomer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Customer does not belong to this company",
      });
    }

    if (firstName !== undefined) {
      if (typeof firstName !== "string" || !firstName.trim()) {
        return res.status(400).json({
          success: false,
          message: "firstName must be a non-empty string",
        });
      }
    }

    if (lastName !== undefined) {
      if (typeof lastName !== "string" || !lastName.trim()) {
        return res.status(400).json({
          success: false,
          message: "lastName must be a non-empty string",
        });
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "phone must be a non-empty string",
        });
      }
      const trimmedPhone = phone.trim();
      const duplicatePhone = await prisma.customer.findFirst({
        where: {
          companyId,
          phone: trimmedPhone,
          id: { not: id },
        },
      });
      if (duplicatePhone) {
        return res.status(409).json({
          success: false,
          message: "A customer with this phone number already exists for this company",
        });
      }
    }

    if (address !== undefined) {
      if (typeof address !== "string" || !address.trim()) {
        return res.status(400).json({
          success: false,
          message: "address must be a non-empty string",
        });
      }
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

    const data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      email?: string | null;
      leadSource?: string | null;
      address2?: string | null;
      companyName?: string | null;
      notes?: string | null;
    } = {};
    if (firstName !== undefined) data.firstName = firstName.trim();
    if (lastName !== undefined) data.lastName = lastName.trim();
    if (phone !== undefined) data.phone = phone.trim();
    if (address !== undefined) data.address = address.trim();
    if (email !== undefined) data.email = email === null || email === "" ? null : String(email).trim();
    if (leadSource !== undefined) data.leadSource = leadSource === null || leadSource === "" ? null : String(leadSource).trim();
    if (address2 !== undefined) data.address2 = address2 === null || address2 === "" ? null : String(address2).trim();
    if (companyName !== undefined) data.companyName = companyName === null || companyName === "" ? null : String(companyName).trim();
    if (notes !== undefined) data.notes = notes === null || notes === "" ? null : String(notes).trim();

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: { company: true },
    });

    return res.status(200).json({
      success: true,
      message: "Customer updated successfully",
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Delete a customer.
 * Body must include id (customer id) and companyId; customer is only deleted if it belongs to the company.
 */
export const deleteCustomer = async (
  req: Request<{}, {}, DeleteCustomerBody>,
  res: Response
) => {
  try {
    const { id, companyId } = req.body;

    if (!companyId || typeof companyId !== "string" || !companyId.trim()) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    if (!id || typeof id !== "string" || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer id is required",
      });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existingCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    if (existingCustomer.companyId !== companyId) {
      return res.status(403).json({
        success: false,
        message: "Customer does not belong to this company",
      });
    }

    await prisma.customer.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Delete customer error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
