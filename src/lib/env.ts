import { z } from "zod";

/** Absolute URL or same-origin path (e.g. `/api/v1` behind clinic nginx). */
const apiUrlSchema = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("/") || z.string().url().safeParse(value).success,
    { message: "Must be an absolute URL or a path starting with /" },
  )
  .default("http://localhost:4001/api/v1");

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: apiUrlSchema,
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
