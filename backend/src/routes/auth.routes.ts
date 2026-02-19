import express from 'express';
import {
  loginUser,
  registerUser,
  refreshAccessToken,
  getMe,
  logoutUser
} from "../controllers/auth.controllers";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshAccessToken);
router.post('/me', requireAuth, getMe);
router.post('/logout', logoutUser);

export default router;