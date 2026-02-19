import express from 'express';
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  getMe,
  logoutUser
} from "../controllers/auth.controllers";
import { requireAuth } from "../middleware/auth.middleware";
import { requireBusinessContext, requireBusinessRole } from "../middleware/business.middleware";

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/me', requireAuth, requireBusinessContext, requireBusinessRole("admin"), getMe);
router.post('/logout', logoutUser);

export default router;