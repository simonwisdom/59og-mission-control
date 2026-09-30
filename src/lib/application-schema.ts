import { z } from "zod";

const required = (message: string, max = 5000) =>
  z.string(message).trim().min(1, message).max(max);

// Blank or missing inputs become null so the database doesn't fill up with empty strings.
const optional = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || null);

const fields = z.object({
  name: required("Name is required", 200),
  email: z.string("Enter a valid email").trim().pipe(z.email("Enter a valid email")),
  phone: optional(50),
  pronouns: optional(50),
  arrivalDate: z.iso.date("Choose an arrival date"),
  departureDate: z.iso.date("Choose a departure date"),
  partySize: z.coerce
    .number("Enter how many people")
    .int()
    .min(1, "At least 1 person")
    .max(20, "That's a lot of people. Contact us directly"),
  about: required("Tell us a bit about yourself"),
  reason: required("Tell us why you'd like to stay"),
  connection: optional(),
  dietaryNeeds: optional(),
  allergies: optional(),
  pets: optional(),
  agreedToRules: z.literal("on", "You need to agree to the house rules").transform(() => true),
});

const stayDates = fields.pick({ arrivalDate: true, departureDate: true });

export const applicationSchema = fields.refine((data) => data.departureDate >= data.arrivalDate, {
  path: ["departureDate"],
  message: "Departure must be on or after arrival",
  // Check date order whenever both dates are valid, even if other fields have errors,
  // so people see every problem in one go.
  when: (payload) => stayDates.safeParse(payload.value).success,
});

export type ApplicationInput = z.output<typeof applicationSchema>;
export type FieldErrors = Partial<Record<keyof ApplicationInput, string>>;

type ParseResult =
  | { success: true; data: ApplicationInput }
  | { success: false; errors: FieldErrors };

export function parseApplication(formData: FormData): ParseResult {
  const raw = Object.fromEntries(
    Object.keys(fields.shape).map((key) => [key, formData.get(key) ?? undefined]),
  );
  const result = applicationSchema.safeParse(raw);
  if (result.success) return { success: true, data: result.data };

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ApplicationInput;
    errors[field] ??= issue.message;
  }
  return { success: false, errors };
}
