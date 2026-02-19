import express from 'express';
import { addEmployee, createCompany } from "../controllers/company.controllers";
import { requireAuth } from "../middleware/auth.middleware";

const router = express.Router();

router.post('/create', requireAuth, createCompany);
router.post('/add-employee', requireAuth, addEmployee);

export default router;