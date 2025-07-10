import { Router, type Router as ExpressRouter } from 'express';
import { getProductByBarcode } from '../controllers/product.controller';

const router: ExpressRouter = Router();

// Product routes
router.get('/barcode/:barcode', getProductByBarcode);

export default router;