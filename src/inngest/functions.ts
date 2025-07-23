import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSandbox } from "./utils";
import Sandbox from "@e2b/code-interpreter";
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
export const helloWorldGemini = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {

        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("vibe-app-demo-2");
            return sandbox.sandboxId;
        });


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

        const sandboxUrl = await step.run("get-sendbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        })

        return { output: codeAgent };
    }
);


