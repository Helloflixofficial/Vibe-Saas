
import { inngest } from '@/inngest/client';
import { z } from 'zod';
import { baseProcedure, createTRPCRouter } from '../init';
export const appRouter = createTRPCRouter({
    invoke: baseProcedure
        .input(
            z.object({
                value: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            console.log("🔥 Sending event to Inngest with value:", input.value);

            try {
                const result = await inngest.send({
                    name: "test/hello.world",
                    data: {
                        value: input.value
                    }
                });

                console.log("✅ Inngest send result:", result);

                return {
                    message: `✅ Event sent with value: "${input.value}"`,
                    inngestResult: result
                };
            } catch (error) {
                console.error("❌ Error sending to Inngest:", error);
                throw error;
            }
        }),
});

export type AppRouter = typeof appRouter;
