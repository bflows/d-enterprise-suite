import express from 'express';
import { checkUserByEmail, createEmployee, createCompany, getEmployees } from "../controllers/company.controllers";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = express.Router();

router.post('/create', requireAuth, createCompany);
router.get('/check-email', requireAuth, requireRole('admin'), checkUserByEmail);
router.post('/create-employee', requireAuth, requireRole('admin'), createEmployee);
router.post('/employees', requireAuth, requireRole('admin'), getEmployees);

export default router;