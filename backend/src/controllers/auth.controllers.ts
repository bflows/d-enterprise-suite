import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { prisma } from "../lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshExpiresAt,
  hashRefreshToken,
  verifyRefreshToken,
  type RefreshTokenPayload
} from "../services/token.service";
import { ROLE_SLUGS } from "../constants/roles";
import { getRefreshCookieOptions } from "../lib/refreshCookie";

// interface RegisterUserType {
//   email: string;
//   password: string;
//   firstName: string;
//   lastName: string;
//   phoneNumber: string;
// }

interface LoginUserType {
  email: string;
  password: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginFieldErrors = Partial<Record<"email" | "password", string>>;

function sanitizeUser(user: any) {
  const { password: _p, ...rest } = user;
  return rest;
}

// export const registerUser = async (req: Request<{}, {}, RegisterUserType>, res: Response) => {
//   try {
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     const {
//       email,
//       password,
//       firstName,
//       lastName,
//       phoneNumber
//     } = req.body;

//     if (!email || !password || !firstName || !lastName || !phoneNumber) {
//       return res.status(400).json({ success: false, message: "All fields are required" });
//     }

//     if (firstName.length < 3) {
//       return res.status(400).json({ success: false, message: "First name must be at least 3 characters" });
//     }

//     if (lastName.length < 3) {
//       return res.status(400).json({ success: false, message: "Last name must be at least 3 characters" });
//     }

//     if (phoneNumber.length < 10) {
//       return res.status(400).json({ success: false, message: "Phone number must be 10 digits" });
//     }

//     if (password.length < 8) {
//       return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
//     }

//     const trimmedEmail = email.trim().toLowerCase();
//     if (!emailRegex.test(trimmedEmail)) {
//       return res.status(400).json({ success: false, message: "Please provide a valid email address" });
//     }


//     const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
//     if (existingUserByEmail) {
//       return res.status(400).json({ success: false, message: "Email is already in use" });
//     }

//     const trimmedFirstName = firstName.trim();
//     const trimmedLastName = lastName.trim();
//     const saltRounds = 10;
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     const user = await prisma.user.create({
//       data: {
//         email: trimmedEmail,
//         passwordHash: hashedPassword,
//         firstName: trimmedFirstName,
//         lastName: trimmedLastName,
//         phoneNumber
//       }
//     });

//     const expiresAt = getRefreshExpiresAt();
//     const session = await prisma.refreshSession.create({
//       data: {
//         userId: user.id,
//         refreshTokenHash: '',
//         expiresAt,
//         userAgent: req.headers['user-agent'] ?? null,
//         ip: (req.ip ?? req.socket?.remoteAddress) ?? null
//       }
//     });

//     const refreshToken = generateRefreshToken(session.id, user.id);
//     const tokenHash = hashRefreshToken(refreshToken);
//     await prisma.refreshSession.update({
//       where: { id: session.id },
//       data: { refreshTokenHash: tokenHash }
//     });

//     res.cookie('refreshToken', refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       path: '/api/auth',
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     const accessToken = generateAccessToken(user.id, undefined, session.id);

//     return res.status(201).json({
//       success: true,
//       message: "User registered successfully",
//       accessToken,
//       user: sanitizeUser(user)
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error. Please try again later."
//     });
//   }
// };

export const loginUser = async (req: Request<{}, {}, LoginUserType>, res: Response) => {
  try {
    const { email, password } = req.body;

    const errors: LoginFieldErrors = {};
    const rawEmail = typeof email === "string" ? email : "";
    const trimmedEmail = rawEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      errors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address.";
    }

    const passwordStr = typeof password === "string" ? password : "";
    if (!passwordStr) {
      errors.password = "Password is required.";
    } else if (passwordStr.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        errors,
      });
    }

    const user = await prisma.user.findUnique({ where: { email: trimmedEmail } });

    if (!user) {
      return res.status(401).json({
        success: false,
        errors: {
          email: "Invalid credentials",
        },
      });
    }

    const isPasswordValid = await bcrypt.compare(passwordStr, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        errors: {
          password: "Invalid credentials",
        },
      });
    }

    const expiresAt = getRefreshExpiresAt();
    const session = await prisma.refreshSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: '',
        expiresAt,
        userAgent: req.headers['user-agent'] ?? null,
        ip: (req.ip ?? req.socket?.remoteAddress) ?? null
      }
    });

    // Auto-set company context from first employment so requireRole works without calling /context
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id },
      include: { company: true, role: true },
    });

    const companyId = employee?.company?.id;
    const refreshToken = generateRefreshToken(session.id, user.id, companyId);
    const tokenHash = hashRefreshToken(refreshToken);
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: tokenHash }
    });

    res.cookie('refreshToken', refreshToken, getRefreshCookieOptions());

    const accessToken = generateAccessToken(user.id, companyId, session.id);

    const userPayload = sanitizeUser(user) as Record<string, unknown>;
    if (employee?.roleSlug) {
      userPayload.role = employee.roleSlug;
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      accessToken,
      user: userPayload
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required"
      });
    }

    let payload: RefreshTokenPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    const session = await prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      include: { user: true }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }

    const tokenHash = hashRefreshToken(refreshToken);
    if (session.refreshTokenHash !== tokenHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }

    if (new Date() > session.expiresAt) {
      await prisma.refreshSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      });
      return res.status(401).json({
        success: false,
        message: "Refresh token has expired"
      });
    }

    if (session.revokedAt) {
      await prisma.refreshSession.deleteMany({
        where: { userId: session.userId }
      });
      return res.status(401).json({
        success: false,
        message: "Refresh token has been revoked. Please log in again."
      });
    }

    const expiresAt = getRefreshExpiresAt();
    const newSession = await prisma.refreshSession.create({
      data: {
        userId: session.userId,
        refreshTokenHash: '',
        expiresAt,
        userAgent: req.headers['user-agent'] ?? null,
        ip: (req.ip ?? req.socket?.remoteAddress) ?? null
      }
    });

    // Use company from refresh token, or auto-fill from user's first employment (so role routes work without /context)
    let companyId = payload.companyId;
    if (companyId === undefined || companyId === null) {
      const employee = await prisma.employee.findFirst({
        where: { userId: session.userId },
        include: { company: true },
      });
      companyId = employee?.company?.id;
    }
    const newRefreshToken = generateRefreshToken(newSession.id, session.userId, companyId);
    const newTokenHash = hashRefreshToken(newRefreshToken);
    await prisma.refreshSession.update({
      where: { id: newSession.id },
      data: { refreshTokenHash: newTokenHash }
    });

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() }
    });

    res.cookie('refreshToken', newRefreshToken, getRefreshCookieOptions());

    const accessToken = generateAccessToken(session.userId, companyId, newSession.id);

    const userRecord = session.user;
    const userPayload = sanitizeUser(userRecord) as Record<string, unknown>;
    if (companyId) {
      const emp = await prisma.employee.findFirst({
        where: { userId: session.userId, companyId },
      });
      userPayload.role = emp?.roleSlug ?? ROLE_SLUGS.EMPLOYEE;
    }

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      accessToken,
      user: userPayload
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

/**
 * Returns the current user's employments (company + role) for the authenticated user.
 * Used by the frontend to populate role in memory and optionally support company switcher.
 */
export const getEmployment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const employees = await prisma.employee.findMany({
      where: { userId: req.user.id },
      include: { company: true },
    });

    const employments = employees.map((e) => ({
      companyId: e.companyId,
      companyName: e.company.name,
      roleSlug: e.roleSlug,
    }));

    const currentCompany = req.business ?? null;
    const currentRole = req.businessRole?.roleSlug ?? null;

    return res.status(200).json({
      success: true,
      employments,
      currentCompany,
      currentRole,
    });
  } catch (error) {
    console.error("Get employment error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};

/**
 * Logs out the user by revoking the current refresh session and clearing the refresh token cookie.
 * Idempotent: returns success even when no valid refresh token is present (e.g. already logged out).
 */
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        const session = await prisma.refreshSession.findUnique({
          where: { id: payload.sid },
        });
        if (session && !session.revokedAt) {
          const tokenHash = hashRefreshToken(refreshToken);
          if (session.refreshTokenHash === tokenHash) {
            await prisma.refreshSession.update({
              where: { id: session.id },
              data: { revokedAt: new Date() },
            });
          }
        }
      } catch {
        // Token invalid or expired — still clear cookie below
      }
    }

    res.clearCookie('refreshToken', getRefreshCookieOptions());

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error("Logout user error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later."
    });
  }
};