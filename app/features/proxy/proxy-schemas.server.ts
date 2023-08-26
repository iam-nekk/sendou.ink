import { z } from "zod";

export const discordPfpParams = z.object({ discordId: z.string(), discordAvatar: z.string() });