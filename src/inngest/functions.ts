
import { inngest } from "./client";
import { createAgent, gemini } from "@inngest/agent-kit";
import Sandbox from "@e2b/code-interpreter";
import { getSandbox } from "./utils";
export const helloWorldGemini = inngest.createFunction(
    { id: "hello-world-gemini" },
    { event: "test/hello.world" },
    async ({ event, step }) => {

        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("vibe-app-demo-2");
            return sandbox.sandboxId;
        });
        const codeAgent = createAgent({
            model: gemini({
                model: "gemini-1.5-flash", // or use "gemini-2.5-pro" if needed
                apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
            }),
            name: "Gemini Dev Assistant",
            system: "You're a helpful AI assistant that helps with development tasks.",
        });



        const { output } = await codeAgent.run(
            `Write the foollowing snippet :${event.data.Value}`
        )

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        return { output, sandboxUrl };
    }
);