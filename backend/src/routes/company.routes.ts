import express from 'express';
import { addEmployee, createCompany, getEmployees } from "../controllers/company.controllers";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = express.Router();

router.post('/create', requireAuth, createCompany);
router.post('/add-employee', requireAuth, addEmployee);
router.post('/employees', requireAuth, requireRole('admin'), getEmployees);

export default router;