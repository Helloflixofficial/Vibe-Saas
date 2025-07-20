import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// FIX: Import the new function name 'helloWorldGemini'
import { helloWorldGemini } from "@/inngest/functions";

// Create an API handler that serves your Inngest functions
export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [
        // FIX: Use the new function 'helloWorldGemini' in the array
        helloWorldGemini
    ],
});