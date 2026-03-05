import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import {
  listByEmployee,
  listAvailableTechniciansForWindow,
  createAvailability,
  updateAvailability,
  deleteAvailability,
} from '../controllers/availability.controllers';

const router = express.Router();

router.get('/', requireAuth, requireRole('admin', 'dispatcher', 'technician'), listByEmployee);
router.get('/available-for-window', requireAuth, requireRole('admin', 'dispatcher', 'technician'), listAvailableTechniciansForWindow);
router.post('/create', requireAuth, requireRole('admin', 'dispatcher', 'technician'), createAvailability);
router.put('/update', requireAuth, requireRole('admin', 'dispatcher', 'technician'), updateAvailability);
router.delete('/delete', requireAuth, requireRole('admin', 'dispatcher', 'technician'), deleteAvailability);

export default router;
