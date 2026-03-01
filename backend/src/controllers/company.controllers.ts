import type { Request, Response } from "express";
import bcrypt from "bcrypt";
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

/** Omit passwordHash from user for API responses. */
function sanitizeUserForResponse<T extends { passwordHash?: string }>(user: T): Omit<T, "passwordHash"> {
  const { passwordHash: _p, ...rest } = user;
  return rest as Omit<T, "passwordHash">;
}

/** Request body for adding an employee. For existing users only email + slug required; for new users also password, firstName, lastName, phoneNumber. */
interface CreateEmployeeBody {
  email: string;
  slug?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

/** Optional fields for updating an employee. userId is required to identify the employee. */
interface UpdateEmployeeBody {
  userId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  role?: string;
  password?: string;
}

/**
 * Add an employee to the current admin's company.
 * - If a user with this email already exists: add them as an employee (only email + slug required).
 * - If not: create the user then add as employee (password, firstName, lastName, phoneNumber required).
 * companyId is taken from req.business (admin's company).
 */
export const createEmployee = async (req: Request<{}, {}, CreateEmployeeBody>, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required. Only admins can create employees.",
      });
    }

    const companyId = req.business.id;
    const {
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      slug = "employee",
    } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address" });
    }

    if (!VALID_ROLE_SLUGS.includes(slug as (typeof VALID_ROLE_SLUGS)[number])) {
      return res.status(400).json({
        success: false,
        message: `slug must be one of: ${VALID_ROLE_SLUGS.join(", ")}`,
      });
    }

    const roleSlug = slug as (typeof VALID_ROLE_SLUGS)[number];
    const [existingUser, company, roleExists] = await Promise.all([
      prisma.user.findUnique({ where: { email: trimmedEmail } }),
      prisma.company.findUnique({ where: { id: companyId } }),
      prisma.role.findFirst({ where: { companyId, slug: roleSlug } }),
    ]);

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }
    if (!roleExists) {
      return res.status(404).json({
        success: false,
        message: `Role '${slug}' not found for this company`,
      });
    }

    if (existingUser) {
      // Add existing user as employee to this company
      const alreadyEmployee = await prisma.employee.findFirst({
        where: { userId: existingUser.id, companyId },
      });
      if (alreadyEmployee) {
        return res.status(409).json({
          success: false,
          message: "This user is already an employee of this company",
        });
      }

      const employee = await prisma.employee.create({
        data: {
          userId: existingUser.id,
          companyId,
          roleSlug,
        },
        include: { user: true, company: true, role: true },
      });

      const sanitizedUser = sanitizeUserForResponse(employee.user);
      return res.status(201).json({
        success: true,
        message: "Employee added successfully",
        employee: { ...employee, user: sanitizedUser },
      });
    }

    // Create new user then add as employee
    if (!password || !firstName || !lastName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "This email is not registered. Please provide password, first name, last name, and phone number to create a new account.",
      });
    }

    if (firstName.length < 3) {
      return res.status(400).json({ success: false, message: "First name must be at least 3 characters" });
    }
    if (lastName.length < 3) {
      return res.status(400).json({ success: false, message: "Last name must be at least 3 characters" });
    }
    if (phoneNumber.length < 10) {
      return res.status(400).json({ success: false, message: "Phone number must be at least 10 characters" });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash: hashedPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      },
    });

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        companyId,
        roleSlug,
      },
      include: { user: true, company: true, role: true },
    });

    const sanitizedUser = sanitizeUserForResponse(employee.user);
    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee: { ...employee, user: sanitizedUser },
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Check if a user exists by email (for "add employee" flow).
 * Returns minimal user info so UI can show "add existing" vs "create new".
 * Requires auth + admin role.
 */
export const checkUserByEmail = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required.",
      });
    }

    const raw = req.query.email;
    const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Valid email query parameter is required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, firstName: true, lastName: true, phoneNumber: true },
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        exists: false,
      });
    }

    const companyId = req.business.id;
    const alreadyEmployee = await prisma.employee.findFirst({
      where: { userId: user.id, companyId },
    });

    return res.status(200).json({
      success: true,
      exists: true,
      alreadyInCompany: !!alreadyEmployee,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error("Check user by email error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getEmployees = async (req: Request, res: Response) => {
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

    const employees = await prisma.employee.findMany({
      where: { companyId },
      include: {
        user: true
      }
    });

    const employeesWithSanitizedUser = employees.map((e) => ({
      ...e,
      user: sanitizeUserForResponse(e.user)
    }));

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully",
      employees: employeesWithSanitizedUser
    });
  } catch (error) {
    console.error("Get employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

/**
 * Terminate an employee from the current company by userId.
 * Removes the employee record; if the user has no other employments, deletes the user.
 * Requires auth + admin role (companyId from req.business).
 */
export const terminateEmployee = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required. Only admins can terminate employees.",
      });
    }

    const companyId = req.business.id;
    const { userId } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId, companyId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found for this company",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.delete({
        where: { id: employee.id },
      });

      const otherEmployments = await tx.employee.count({
        where: { userId },
      });

      if (otherEmployments === 0) {
        await tx.user.delete({
          where: { id: userId },
        });
      }
    });

    return res.status(200).json({
      success: true,
      message: "Employee terminated successfully",
    });
  } catch (error) {
    console.error("Terminate employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

/**
 * Update an employee of the current company by userId.
 * All fields except userId are optional; only provided fields are updated.
 * Requires auth + admin role (companyId from req.business).
 */
export const updateEmployee = async (req: Request<{}, {}, UpdateEmployeeBody>, res: Response) => {
  try {
    if (!req.user || !req.business) {
      return res.status(403).json({
        success: false,
        message: "Business context required. Only admins can update employees.",
      });
    }

    const companyId = req.business.id;
    const { userId, firstName, lastName, phoneNumber, email, role, password } = req.body;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId, companyId },
      include: { user: true, role: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found for this company",
      });
    }

    const hasUpdates = [firstName, lastName, phoneNumber, email, role, password].some(
      (v) => v !== undefined && v !== null
    );
    if (!hasUpdates) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update: firstName, lastName, phoneNumber, email, role, or password",
      });
    }

    if (firstName !== undefined) {
      if (typeof firstName !== "string" || firstName.trim().length < 3) {
        return res.status(400).json({ success: false, message: "First name must be at least 3 characters" });
      }
    }
    if (lastName !== undefined) {
      if (typeof lastName !== "string" || lastName.trim().length < 3) {
        return res.status(400).json({ success: false, message: "Last name must be at least 3 characters" });
      }
    }
    if (phoneNumber !== undefined) {
      if (typeof phoneNumber !== "string" || phoneNumber.trim().length < 10) {
        return res.status(400).json({ success: false, message: "Phone number must be at least 10 characters" });
      }
    }
    if (email !== undefined) {
      const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ success: false, message: "Please provide a valid email address" });
      }
      const existingByEmail = await prisma.user.findUnique({ where: { email: trimmedEmail } });
      if (existingByEmail && existingByEmail.id !== userId) {
        return res.status(409).json({ success: false, message: "Email is already in use by another user" });
      }
    }
    if (role !== undefined) {
      if (!VALID_ROLE_SLUGS.includes(role as (typeof VALID_ROLE_SLUGS)[number])) {
        return res.status(400).json({
          success: false,
          message: `role must be one of: ${VALID_ROLE_SLUGS.join(", ")}`,
        });
      }
      const roleExists = await prisma.role.findFirst({
        where: { companyId, slug: role as (typeof VALID_ROLE_SLUGS)[number] },
      });
      if (!roleExists) {
        return res.status(404).json({
          success: false,
          message: `Role '${role}' not found for this company`,
        });
      }
    }
    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
      }
    }

    const userData: Record<string, unknown> = {};
    if (firstName !== undefined) userData.firstName = firstName.trim();
    if (lastName !== undefined) userData.lastName = lastName.trim();
    if (phoneNumber !== undefined) userData.phoneNumber = phoneNumber.trim();
    if (email !== undefined) userData.email = email.trim().toLowerCase();
    if (password !== undefined) {
      const saltRounds = 10;
      userData.passwordHash = await bcrypt.hash(password, saltRounds);
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userData as Parameters<typeof tx.user.update>[0]["data"],
        });
      }
      if (role !== undefined) {
        await tx.employee.update({
          where: { id: employee.id },
          data: { roleSlug: role as (typeof VALID_ROLE_SLUGS)[number] },
        });
      }
    });

    const updated = await prisma.employee.findUnique({
      where: { id: employee.id },
      include: { user: true, company: true, role: true },
    });

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch updated employee",
      });
    }

    const sanitizedUser = sanitizeUserForResponse(updated.user);
    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: { ...updated, user: sanitizedUser },
    });
  } catch (error) {
    console.error("Update employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};