import { openai, createAgent } from "@inngest/agent-kit";
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event }) => {
        console.log("=== INNGEST FUNCTION STARTED ===");
        console.log("Full event:", JSON.stringify(event, null, 2));
        console.log("Event data value:", event.data?.value);
        console.log("================================");

        if (!event.data?.value) {
            throw new Error("No value provided in event data");
        }

        const summarizer = createAgent({
            name: "summarizer",
            system: "You are an expert summarizer. You summarize in 2 words.",
            model: openai({ model: "gpt-4o-mini" }),
        });

        try {
            console.log("🤖 Running summarizer with text:", event.data.value);

            const { output } = await summarizer.run(
                `Summarize the following text: ${event.data.value}`
            );

            console.log("✅ Summarizer output:", output);
            return { output };
        } catch (error) {
            console.error("❌ Summarizer error:", error);
            throw new Error(`Summarizer failed: ${(error as Error).message}`);
        }
    }
);




// import { inngest } from "./client";

// export const helloWorld = inngest.createFunction(
//     { id: "hello-world" },
//     { event: "test/hello.world" },
//     async ({ event }) => {
//         console.log("=== INNGEST FUNCTION STARTED ===");
//         console.log("Event data value:", event.data?.value);
//         const mockOutput = "test summary";
//         console.log("✅ Mock output:", mockOutput);
//         return { output: mockOutput };
//     }
// );