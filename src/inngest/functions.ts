import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
export const helloWorldGemini = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        console.log("=== GEMINI INNGEST FUNCTION STARTED ===");
        console.log("Full event:", JSON.stringify(event, null, 2));
        console.log("Event data value:", event.data?.value);
        console.log("======================================");
        if (!event.data?.value) {
            throw new Error("No value provided in event data");
        }
        const systemInstruction = "You are an expert summarizer. You summarize in 2 words.";
        const userText = event.data.value;
        const codeAgent = await step.run("codeAgent", async () => {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `${systemInstruction}\n\nSummarize the following text: "${userText}"`;
            console.log(" Running Gemini with prompt:", prompt);
            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text();
        });
        console.log("✅ Gemini summarizer output:", codeAgent);
        return { output: codeAgent };
    }
);




// import { inngest } from "./client";

// export const helloWorld = inngest.createFunction(
//     { id: "hello-world" },
//     { event: "test/hello.world" },
//     async ({ event }) => {
//         console.log("=== INNGEST FUNCTION STARTED ===");
//         console.log("Event data value:", event.data?.value);
//         const mockOutput = "test codeAgent";
//         console.log("✅ Mock output:", mockOutput);
//         return { output: mockOutput };
//     }
// );