import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z][a-z0-9_.]{2,19}$/,
    'Username must be 3–20 characters, start with a letter, and use only letters, numbers, underscores, or periods.',
  );

export const preferencesSchema = z.object({
  userEmail: z.string().optional(),
  username: usernameSchema.optional(),
  displayName: z.string().optional(),
  createdAt: z.number().optional(),
  lastActiveAt: z.number().optional(),
  country: z.string().optional(),
  usState: z.string().optional(),
  onboardingCompletedAt: z.number().optional(),
  themeDark: z.boolean().optional(),
  haptics: z.boolean().optional(),
  audio: z.boolean().optional(),
  strictMode: z.boolean().optional(),
  usernameChangedAt: z.number().optional(),
  pinnedToolIds: z.array(z.string()).optional(),
});

export const updatePreferencesSchema = preferencesSchema.partial();

export function normalizeUsername(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidUsernameFormat(value) {
  return usernameSchema.safeParse(normalizeUsername(value)).success;
}
