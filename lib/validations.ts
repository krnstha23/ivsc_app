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

const timeRegex = /^\d{1,2}:\d{2}$/;

export const createAvailabilitySchema = z
  .object({
    date: z.date({ message: "A valid date is required" }),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format"),
  })
  .refine(
    (d) => {
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      return (sh ?? 0) * 60 + (sm ?? 0) < (eh ?? 0) * 60 + (em ?? 0);
    },
    { message: "End time must be after start time" },
  );

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
  priceStandard: z.coerce.number().min(0, "Standard price must be at least 0"),
  pricePriority: z.coerce.number().min(0, "Priority price must be at least 0"),
  priceInstant: z.coerce.number().min(0, "Instant price must be at least 0"),
  duration: z.coerce.number().int().min(0, "Minimum 0 minutes").max(480, "Maximum 8 hours"),
  hasEvaluation: z.coerce.boolean().default(false),
  discountPercent: z.coerce
    .number()
    .min(0, "Discount must be at least 0")
    .max(100, "Discount must be at most 100")
    .nullable()
    .optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showOnLanding: z.boolean().default(false),
  packageIds: z.array(z.string().uuid()).min(1, "Select at least one package"),
});

export type CreateBundleInput = z.infer<typeof createBundleSchema>;

export const updateAvailabilitySchema = z
  .object({
    id: z.string().uuid("Invalid slot"),
    date: z.date({ message: "A valid date is required" }),
    startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format"),
    endTime: z.string().regex(timeRegex, "End time must be in HH:MM format"),
  })
  .refine(
    (d) => {
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      return (sh ?? 0) * 60 + (sm ?? 0) < (eh ?? 0) * 60 + (em ?? 0);
    },
    { message: "End time must be after start time" },
  );

export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const updateOwnProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  middleName: z.string().max(50).nullable().optional(),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(20).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
});

export type UpdateOwnProfileInput = z.infer<typeof updateOwnProfileSchema>;

/** Admin edit user (no password here; optional reset via separate field). */
export const updateUserAdminSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string().min(1).max(50),
  middleName: z.string().max(50).nullable().optional(),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().max(20).nullable().optional(),
  role: z.enum(["ADMIN", "TEACHER", "USER"]),
  isActive: z.boolean(),
  newPassword: z
    .string()
    .optional()
    .refine(
      (s) => !s || s.length === 0 || s.length >= 8,
      "New password must be at least 8 characters"
    ),
});

export type UpdateUserAdminInput = z.infer<typeof updateUserAdminSchema>;

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
});

export const createStaticPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z.string().min(1, "Content is required"),
  isActive: z.boolean().default(true),
});

export type CreateStaticPageInput = z.infer<typeof createStaticPageSchema>;

export const updateStaticPageSchema = createStaticPageSchema.extend({
  id: z.string().uuid(),
});

export type UpdateStaticPageInput = z.infer<typeof updateStaticPageSchema>;

/** Extract the first human-readable error message from a Zod result. */
export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Validation failed";
}
