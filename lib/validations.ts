import { z } from "zod/v4";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  firstName: z.string().min(1, "First name is required").max(50),
  middleName: z.string().max(50).nullable(),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().max(20).nullable(),
  email: z.string().email("Invalid email address"),
  userType: z.enum(["student", "teacher"]),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(50),
  middleName: z.string().max(50).nullable().optional(),
  lastName: z.string().min(1, "Last name is required").max(50),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum(["ADMIN", "TEACHER", "USER"]).default("USER"),
  isActive: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createAvailabilitySchema = z.object({
  date: z.date({ message: "A valid date is required" }),
  durationMinutes: z.number().int().min(15, "Minimum 15 minutes").max(480, "Maximum 8 hours"),
  time: z
    .string()
    .regex(/^\d{1,2}:\d{2}$/, "Time must be in HH:MM format"),
});

export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;

export const createPackageSchema = z.object({
  name: z.string().min(1, "Package name is required").max(100, "Name is too long"),
  description: z
    .string()
    .max(500, "Description is too long")
    .nullable()
    .optional(),
  price: z.coerce.number().min(0, "Price must be at least 0"),
  isActive: z.boolean().default(true),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;

export const createBundleSchema = z.object({
  name: z.string().min(1, "Bundle name is required").max(100, "Name is too long"),
  description: z
    .string()
    .max(500, "Description is too long")
    .nullable()
    .optional(),
  price: z.coerce.number().min(0, "Price must be at least 0"),
  discountPercent: z.coerce
    .number()
    .min(0, "Discount must be at least 0")
    .max(100, "Discount must be at most 100")
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
  packageIds: z.array(z.string().uuid()).min(1, "Select at least one package"),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;

export const createBookingSchema = z.object({
  availabilityId: z.string().uuid("Invalid slot"),
  packageId: z.string().uuid("Invalid package"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/** Extract the first human-readable error message from a Zod result. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation failed";
}
