import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSandbox } from "./utils";
import Sandbox from "@e2b/code-interpreter";
import z from "zod";
import { createTool } from "@inngest/agent-kit";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export const helloWorldGemini = inngest.createFunction(
    { id: "hello-world" },
    { event: "test/hello.world" },
    async ({ event, step }) => {
        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("vibe-app-demo-2");
            return sandbox.sandboxId;
        });

        const agentTools = [
            createTool({
                name: "terminal",
                description: "Run terminal commands in sandbox",
                parameters: z.object({ command: z.string() }),
                handler: async ({ command }, { step }) => {
                    return await step?.run("terminal-execution", async () => {
                        const buffers = { stdout: "", stderr: "" };
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const result = await sandbox.commands.run(command, {
                                onStdout: (d) => (buffers.stdout += d),
                                onStderr: (d) => (buffers.stderr += d),
                            });
                            return {
                                success: true,
                                stdout: result.stdout || buffers.stdout,
                                stderr: buffers.stderr,
                                exitCode: result.exitCode,
                            };
                        } catch (e) {
                            return {
                                success: false,
                                error: `${e}`,
                                stdout: buffers.stdout,
                                stderr: buffers.stderr,
                            };
                        }
                    });
                },
            }),

            createTool({
                name: "createOrUpdateFiles",
                description: "Create/update files in sandbox",
                parameters: z.object({
                    filePath: z.string(),
                    content: z.string(),
                    append: z.boolean().optional(),
                }),
                handler: async ({ filePath, content, append = false }, { step }) => {
                    return await step?.run("file-write", async () => {
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            await sandbox.files.write(filePath, content, { append });
                            return {
                                success: true,
                                message: `${append ? "Appended" : "Created"}: ${filePath}`,
                            };
                        } catch (e) {
                            return { success: false, error: `${e}` };
                        }
                    });
                },
            }),

            createTool({
                name: "readFiles",
                description: "Read multiple files",
                parameters: z.object({ filePaths: z.array(z.string()) }),
                handler: async ({ filePaths }, { step }) => {
                    return await step?.run("file-read", async () => {
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const files = await Promise.all(
                                filePaths.map(async (path) => {
                                    try {
                                        const content = await sandbox.files.read(path);
                                        return { filePath: path, content };
                                    } catch (err) {
                                        return { filePath: path, error: `${err}` };
                                    }
                                })
                            );
                            return { success: true, files };
                        } catch (e) {
                            return { success: false, error: `${e}` };
                        }
                    });
                },
            }),
        ];

        const output = await step.run("codeAgent", async () => {
            const userText = event.data?.value ?? "Build a React component.";
            const prompt = `
You are an expert React.js developer. Write clean, readable code.

User: "${userText}"

You can use tools like terminal, readFiles, and createOrUpdateFiles.
`.trim();

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" });
                const result = await model.generateContent(prompt);
                let text = result.response.text();

                const match = text.match(/`([^`]+)`/);
                if (match) {
                    const terminalResult = await agentTools[0].handler({ command: match[1] }, { step });
                    text += `\n\n🧪 Terminal Result:\n${JSON.stringify(terminalResult, null, 2)}`;
                }

                return text;
            } catch (error) {
                return `❌ Error: ${error}`;
            }
        });

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            try {
                const sandbox = await getSandbox(sandboxId);
                return `https://${sandbox.getHost(3000)}`;
            } catch {
                return "⚠️ Sandbox not yet ready.";
            }
        });

        return {
            output,
            sandboxUrl,
            sandboxId,
            toolsAvailable: agentTools.map((t) => ({
                name: t.name,
                description: t.description,
            })),
        };
    }
);
