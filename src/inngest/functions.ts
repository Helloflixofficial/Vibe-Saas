import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSandbox } from "./utils";
import Sandbox from "@e2b/code-interpreter";
import { createTool } from "@inngest/agent-kit";
import z from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);


const tools = [
    createTool({
        name: "Terminal",
        description: "Use This Terminal for Actions",
        parameters: z.object({
            Command: z.string(),
        }),
        handler: async (
            { Command }: { Command: string },
            { step }: { step: any }
        ) => {
            return await step?.run("terminal", async () => {
                const buffers = { stdout: "", stderr: "" };
                try {
                    const sandbox = await getSandbox(sandboxId);
                    const result = await sandbox.commands.run(Command, {
                        onStdout: (data: string) => {
                            buffers.stdout += data;
                        },
                        onStderr: (data: string) => {
                            buffers.stderr += data;
                        },
                    });
                    return result.stdout;
                } catch (e) {
                    console.error(
                        `Command execution failed ${e} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`
                    );
                    return `Command execution failed ${e} \nstdout: ${buffers.stdout} \nstderr: ${buffers.stderr}`;
                }
            });
        },
    }),
];

export const helloWorldGemini = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("vibe-app-demo-2");
            return sandbox.sandboxId;
        });

        const codeAgent = await step.run("codeAgent", async () => {
            const systemInstruction =
                "You are an expert Reactjs developer. You write readable and clean code";
            const userText = event.data.value;

            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-flash",
                // If tools are supported here, you can pass them in like this:
                // tools
            });

            const prompt = `${systemInstruction}\n\nwrite the following snippet: "${userText}"`;
            console.log("Running Gemini with prompt:", prompt);

            const result = await model.generateContent(prompt);
            return result.response.text();
        });

        console.log("✅ Gemini summarizer output:", codeAgent);

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        return { output: codeAgent, sandboxUrl };
    }
);
