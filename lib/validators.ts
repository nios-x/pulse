import { z } from "zod";
import { LOCALES } from "@/lib/i18n";

export const localeSchema = z.object({ locale: z.enum(LOCALES) });
