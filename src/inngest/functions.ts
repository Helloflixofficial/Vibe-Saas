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
        const systemInstruction = "You are an expert Reactjs developer. You write readable and clean code";
        const userText = event.data.value;
        const codeAgent = await step.run("codeAgent", async () => {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `${systemInstruction}\n\nwrite the following smippit: "${userText}"`;
            console.log(" Running Gemini with prompt:", prompt);
            const result = await model.generateContent(prompt);
            const response = result.response;
            return response.text();
        });
        console.log("✅ Gemini summarizer output:", codeAgent);
        return { output: codeAgent };
    }
);


