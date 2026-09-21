import { Router } from 'express';
import {
  createShipment, getShipmentByTransaction, assignVehicle, confirmPickup, addCheckpoint, markDelivered,
} from '../controllers/shipmentController.js';

const router = Router();
router.post('/', createShipment);
router.get('/by-transaction/:transactionId', getShipmentByTransaction);
router.patch('/:id/vehicle', assignVehicle);
router.patch('/:id/pickup', confirmPickup);
router.post('/:id/checkpoints', addCheckpoint);
router.patch('/:id/deliver', markDelivered);

export default router;
