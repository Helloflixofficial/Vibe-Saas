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
                description: "Execute terminal commands in the sandbox environment",
                parameters: z.object({
                    command: z.string().describe("The terminal command to execute"),
                }),
                handler: async (
                    { command }: { command: string },
                    { step }: { step: any }
                ) => {
                    return await step?.run("terminal-execution", async () => {
                        const buffers = { stdout: "", stderr: "" };
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const result = await sandbox.commands.run(command, {
                                onStdout: (data: string) => { buffers.stdout += data; },
                                onStderr: (data: string) => { buffers.stderr += data; }
                            });
                            return {
                                success: true,
                                stdout: result.stdout || buffers.stdout,
                                stderr: buffers.stderr,
                                exitCode: result.exitCode
                            };
                        } catch (e) {
                            console.error(`Command execution failed: ${e}`);
                            return {
                                success: false,
                                error: `Command execution failed: ${e}`,
                                stdout: buffers.stdout,
                                stderr: buffers.stderr
                            };
                        }
                    });
                },
            }),

            createTool({
                name: "createOrUpdateFiles",
                description: "Create new files or update existing files in the sandbox",
                parameters: z.object({
                    filePath: z.string().describe("The path where the file should be created or updated"),
                    content: z.string().describe("The content to write to the file"),
                    append: z.boolean().optional().describe("Whether to append to existing file (default: false)")
                }),
                handler: async (
                    { filePath, content, append = false }: { filePath: string; content: string; append?: boolean },
                    { step }: { step: any }
                ) => {
                    return await step?.run("file-write", async () => {
                        try {
                            const sandbox = await getSandbox(sandboxId);

                            if (append) {
                                await sandbox.files.write(filePath, content, { append: true });
                            } else {
                                await sandbox.files.write(filePath, content);
                            }

                            return {
                                success: true,
                                message: `File ${append ? 'updated' : 'created'} successfully: ${filePath}`,
                                filePath
                            };
                        } catch (e) {
                            console.error(`File operation failed: ${e}`);
                            return {
                                success: false,
                                error: `File operation failed: ${e}`,
                                filePath
                            };
                        }
                    });
                },
            }),

            createTool({
                name: "readFiles",
                description: "Read the content of files from the sandbox",
                parameters: z.object({
                    filePaths: z.array(z.string()).describe("Array of file paths to read"),
                }),
                handler: async (
                    { filePaths }: { filePaths: string[] },
                    { step }: { step: any }
                ) => {
                    return await step?.run("file-read", async () => {
                        try {
                            const sandbox = await getSandbox(sandboxId);
                            const results = [];

                            for (const filePath of filePaths) {
                                try {
                                    const content = await sandbox.files.read(filePath);
                                    results.push({
                                        filePath,
                                        content,
                                        success: true
                                    });
                                } catch (e) {
                                    results.push({
                                        filePath,
                                        error: `Failed to read file: ${e}`,
                                        success: false
                                    });
                                }
                            }

                            return {
                                success: true,
                                files: results
                            };
                        } catch (e) {
                            console.error(`File read operation failed: ${e}`);
                            return {
                                success: false,
                                error: `File read operation failed: ${e}`
                            };
                        }
                    });
                },
            })
        ];

        const codeAgent = await step.run("codeAgent", async () => {
            const systemInstruction = `You are an expert React.js developer. You write readable and clean code`;

            const userText = event.data.value;
            const model = genAI.getGenerativeModel({
                model: "gemini‑2.5‑pro",
                systemInstruction
            });

            const prompt = `Please help me with the following development task: "${userText}"
            
Use the available tools as needed to accomplish this task. If you need to create files, run commands, or read existing files, use the appropriate tools.`;

            console.log("🚀 Running Gemini with prompt:", prompt);

            try {
                const result = await model.generateContent(prompt);
                const response = result.response;
                let responseText = response.text();
                if (responseText.toLowerCase().includes('terminal') ||
                    responseText.toLowerCase().includes('command')) {
                    const commandMatch = responseText.match(/`([^`]+)`/);
                    if (commandMatch) {
                        const command = commandMatch[1];
                        console.log(`🔧 Executing suggested command: ${command}`);

                        // Execute the command using our tool
                        const terminalResult = await agentTools[0].handler(
                            { command },
                            { step }
                        );

                        responseText += `\n\n📋 Command execution result:\n${JSON.stringify(terminalResult, null, 2)}`;
                    }
                }

                return responseText;

            } catch (error) {
                console.error("❌ Gemini API error:", error);
                return `Error generating response: ${error}`;
            }
        });

        console.log("✅ Gemini agent output:", codeAgent);

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await getSandbox(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        return {
            output: codeAgent,
            sandboxUrl,
            sandboxId,
            availableTools: agentTools.map(tool => ({
                name: tool.name,
                description: tool.description
            }))
        };
    }
);

