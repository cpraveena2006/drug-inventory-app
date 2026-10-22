import { z } from "zod";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Must be a valid id");
export const idParams = z.object({ id: objectId });

export const drugBody = z.object({
  name: z.string().trim().min(1).max(200),
  genericName: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  manufacturer: z.string().trim().max(200).optional(),
  composition: z.string().trim().max(500).optional(),
  unit: z.string().trim().max(50).optional(),
  unitPrice: z.coerce.number().min(0),
  reorderThreshold: z.coerce.number().int().min(0).optional(),
  requiresPrescription: z.boolean().optional(),
  barcode: z.string().trim().max(100).optional(),
});
export const drugUpdateBody = drugBody.partial().refine((body) => Object.keys(body).length > 0, "At least one field is required");

export const supplierBody = z.object({
  name: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  leadTimeDays: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});
export const supplierUpdateBody = supplierBody.partial().refine((body) => Object.keys(body).length > 0, "At least one field is required");

export const batchBody = z.object({
  drug: objectId,
  supplier: objectId,
  batchNumber: z.string().trim().min(1).max(100),
  manufactureDate: z.coerce.date(),
  expiryDate: z.coerce.date(),
  quantityReceived: z.coerce.number().int().positive(),
  warehouseLocation: z.string().trim().max(200).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  barcode: z.string().trim().max(100).optional(),
});
export const batchUpdateBody = z.object({
  warehouseLocation: z.string().trim().max(200).optional(),
  status: z.enum(["active", "expired", "recalled", "depleted", "quarantined"]).optional(),
}).refine((body) => Object.keys(body).length > 0, "At least one field is required");

const orderItem = z.object({
  drug: objectId,
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
});
export const purchaseOrderBody = z.object({
  supplier: objectId,
  items: z.array(orderItem).min(1),
  notes: z.string().trim().max(2000).optional(),
  expectedDeliveryDate: z.coerce.date().optional(),
});
export const dispatchOrderBody = z.object({
  buyerName: z.string().trim().min(1).max(200),
  items: z.array(orderItem).min(1),
  notes: z.string().trim().max(2000).optional(),
});
