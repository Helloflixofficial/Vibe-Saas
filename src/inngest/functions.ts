import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client with your API key
// It's safe to use the non-null assertion (!) here because Inngest will
// not run the function if the environment variable is missing.
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export const helloWorldGemini = inngest.createFunction(
    { id: "hello-world-gemini" }, // It's a good practice to give it a new ID
    { event: "test/hello.world" },
    async ({ event, step }) => {
        console.log("=== GEMINI INNGEST FUNCTION STARTED ===");
        console.log("Full event:", JSON.stringify(event, null, 2));
        console.log("Event data value:", event.data?.value);
        console.log("======================================");

        if (!event.data?.value) {
            throw new Error("No value provided in event data");
        }

        // The 'system' prompt from the original agent is now part of the main prompt.
        const systemInstruction = "You are an expert summarizer. You summarize in 2 words.";
        const userText = event.data.value;

        // Use step.run to make the API call durable and resilient to failures.
        const summary = await step.run("summarize-text-with-gemini", async () => {
            // Get the generative model, e.g., 'gemini-1.5-flash' is fast and capable.
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `${systemInstruction}\n\nSummarize the following text: "${userText}"`;

            console.log("🤖 Running Gemini with prompt:", prompt);

            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text();
        });

        console.log("✅ Gemini summarizer output:", summary);
        return { output: summary };
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