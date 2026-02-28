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

// const VALID_ROLE_SLUGS_LEGACY = ["employee", "technician", "dispatcher", "admin"] as const;

// export const addEmployee = async (req: Request, res: Response) => {
//   try {
//     const { userId, companyId, roleSlug = "employee" } = req.body;

//     if (!userId || !companyId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId and companyId are required"
//       });
//     }

//     if (!VALID_ROLE_SLUGS_LEGACY.includes(roleSlug)) {
//       return res.status(400).json({
//         success: false,
//         message: `roleSlug must be one of: ${VALID_ROLE_SLUGS_LEGACY.join(", ")}`
//       });
//     }

//     const [user, company, roleExists] = await Promise.all([
//       prisma.user.findUnique({ where: { id: userId } }),
//       prisma.company.findUnique({ where: { id: companyId } }),
//       prisma.role.findFirst({ where: { companyId, slug: roleSlug } })
//     ]);

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }
//     if (!company) {
//       return res.status(404).json({
//         success: false,
//         message: "Company not found"
//       });
//     }
//     if (!roleExists) {
//       return res.status(404).json({
//         success: false,
//         message: `Role '${roleSlug}' not found for this company`
//       });
//     }

//     const existing = await prisma.employee.findFirst({
//       where: {
//         userId,
//         companyId,
//         role: { slug: roleSlug }
//       }
//     });

//     if (existing) {
//       return res.status(409).json({
//         success: false,
//         message: "User is already assigned this role in this company"
//       });
//     }

//     const employee = await prisma.employee.create({
//       data: { userId, companyId, roleSlug },
//       include: { user: true, company: true, role: true }
//     });

//     return res.status(201).json({
//       success: true,
//       message: "Employee added successfully",
//       employee
//     });
//   } catch (error) {
//     console.error("Add employee error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error. Please try again later."
//     });
//   }
// };

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