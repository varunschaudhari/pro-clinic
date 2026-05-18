import { z } from 'zod';

const objectId = /^[0-9a-fA-F]{24}$/;

export const createDrugSchema = z.object({
  name:                 z.string().trim().min(1, 'Name required').max(200),
  genericName:          z.string().trim().max(200).optional(),
  brand:                z.string().trim().max(200).optional(),
  manufacturer:         z.string().trim().max(200).optional(),

  category: z.enum(['medicine', 'consumable', 'equipment', 'supplement', 'other']).default('medicine'),
  unit:     z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'sachet', 'other']),
  packSize: z.coerce.number().int().positive().optional(),

  sellingPrice:  z.coerce.number().min(0),
  mrp:           z.coerce.number().min(0),
  purchasePrice: z.coerce.number().min(0).default(0),

  hsnCode:  z.string().trim().max(20).optional(),
  gstRate:  z.coerce.number().refine((v) => [0, 5, 12, 18, 28].includes(v), 'Invalid GST rate').default(0),

  schedule:               z.enum(['H', 'H1', 'X', 'G', 'OTC']).optional(),
  requiresPrescription:   z.boolean().default(false),

  reorderLevel: z.coerce.number().min(0).default(10),
  maxStock:     z.coerce.number().min(0).optional(),
  location:     z.string().trim().max(100).optional(),
  notes:        z.string().trim().max(500).optional(),

  // Optional opening stock
  initialQuantity:    z.coerce.number().min(0).optional(),
  initialBatchNumber: z.string().trim().optional(),
  initialExpiryDate:  z.string().optional(),
});

export const updateDrugSchema = createDrugSchema.partial().omit({
  initialQuantity: true,
  initialBatchNumber: true,
  initialExpiryDate: true,
});

export const stockInSchema = z.object({
  quantity:      z.coerce.number().positive('Quantity must be positive'),
  batchNumber:   z.string().trim().max(50).optional(),
  expiryDate:    z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  mrp:           z.coerce.number().min(0).optional(),
  sellingPrice:  z.coerce.number().min(0).optional(),
  notes:         z.string().trim().max(500).optional(),
});

export const dispenseSchema = z.object({
  items: z.array(
    z.object({
      drugId:   z.string().regex(objectId, 'Invalid drug ID'),
      quantity: z.coerce.number().positive('Quantity must be positive'),
    })
  ).min(1, 'At least one item required'),
  prescriptionId: z.string().regex(objectId).optional(),
  patientId:      z.string().regex(objectId).optional(),
  notes:          z.string().trim().max(500).optional(),
});

export const stockOutSchema = z.object({
  quantity:    z.coerce.number().positive('Quantity must be positive'),
  type:        z.enum(['expired', 'adjustment']).default('adjustment'),
  batchNumber: z.string().trim().max(50).optional(),
  notes:       z.string().trim().max(500).optional(),
});

export const listDrugsSchema = z.object({
  search:   z.string().optional(),
  category: z.enum(['medicine', 'consumable', 'equipment', 'supplement', 'other']).optional(),
  lowStock: z.coerce.boolean().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateDrugInput    = z.infer<typeof createDrugSchema>;
export type UpdateDrugInput    = z.infer<typeof updateDrugSchema>;
export type StockInInput        = z.infer<typeof stockInSchema>;
export type StockOutInput       = z.infer<typeof stockOutSchema>;
export type DispenseInput       = z.infer<typeof dispenseSchema>;
export type ListDrugsInput      = z.infer<typeof listDrugsSchema>;
