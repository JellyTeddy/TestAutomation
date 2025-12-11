
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TestCase, TestStep, TestStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const testCaseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    testCases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise title for the test case in Korean" },
          description: { type: Type.STRING, description: "Brief objective of the test in Korean" },
          priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, description: "The step action to perform in Korean" },
                expectedResult: { type: Type.STRING, description: "The expected outcome of the step in Korean" }
              },
              required: ["action", "expectedResult"]
            }
          }
        },
        required: ["title", "priority", "steps"]
      }
    }
  }
};

const simulationDetailedSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: { type: Type.STRING, enum: ["PASSED", "FAILED", "SKIPPED"] },
    executionSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          actionSummary: { type: Type.STRING },
          outcome: { type: Type.STRING, enum: ["PASSED", "FAILED"] },
          logEntry: { type: Type.STRING, description: "Technical observation in Korean" },
          durationMs: { type: Type.INTEGER }
        },
        required: ["stepNumber", "outcome", "logEntry"]
      }
    },
    finalAnalysis: { type: Type.STRING, description: "Root cause analysis or success confirmation in Korean" }
  },
  required: ["overallStatus", "executionSteps", "finalAnalysis"]
};

export const generateTestCases = async (featureDescription: string, contextInfo?: string): Promise<Partial<TestCase>[]> => {
  try {
    const prompt = `
      You are an expert QA Automation Engineer fluent in Korean (한국어).
      
      Target Application Context: ${contextInfo || "General Software Application"}
      
      Task: Generate a comprehensive list of test cases for the following feature/data:
      "${featureDescription}"
      
      Requirements:
      1. Analyze the input feature or data.
      2. Generate test cases covering positive, negative, and edge cases.
      3. CRITICAL: All user-facing text (Titles, Descriptions, Actions, Expected Results) MUST be written in Korean (한국어).
      4. If the context is a Website, assume standard browser interactions.
      5. If the context is a Desktop App, assume standard window/OS interactions.
      
      Return the response in strictly structured JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: testCaseSchema,
        systemInstruction: "You are a helpful QA assistant that generates high-quality software test cases in Korean.",
        thinkingConfig: { thinkingBudget: 2048 } // Use reasoning to generate better edge cases
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText);
    const rawCases = parsed.testCases || [];

    // Map to our internal format with UUIDs
    return rawCases.map((rc: any) => ({
      id: crypto.randomUUID(),
      title: rc.title,
      description: rc.description || "",
      priority: rc.priority as 'Low' | 'Medium' | 'High',
      steps: rc.steps.map((s: any) => ({
        id: crypto.randomUUID(),
        action: s.action,
        expectedResult: s.expectedResult
      }))
    }));

  } catch (error) {
    console.error("Failed to generate test cases:", error);
    throw error;
  }
};

export const simulateTestExecution = async (testCase: TestCase, contextInfo: string): Promise<{ status: TestStatus, notes: string }> => {
  try {
    const stepsText = testCase.steps.map((s, i) => `${i + 1}. ${s.action} -> Expect: ${s.expectedResult}`).join('\n');
    
    const prompt = `
      Role: Autonomous Test Agent
      Task: Simulate the execution of a software test case step-by-step and determine the detailed result.
      
      Context: ${contextInfo}
      Test Case: "${testCase.title}"
      Priority: ${testCase.priority}
      
      Steps to Execute:
      ${stepsText}
      
      Instructions:
      1. Act as if you are executing these steps on the real application. Use the 'Thinking' process to simulate the state of the application at each step.
      2. For each step:
         - Simulate the action.
         - Verify if the expected result is met.
         - Generate a realistic execution log (in Korean).
         - Assign a duration (ms).
      3. Failure Logic:
         - Introduce realistic failures (e.g., Network Timeout, Element Not Visible, 500 Internal Server Error) with a ~15% probability for 'Medium'/'High' priority cases, or if the test case logic is inherently flawed.
         - If a step fails, stop execution of subsequent steps (mark them as skipped implicitly by not including them or noting them).
      4. Determine the Overall Status (PASSED, FAILED).
      
      Return strictly JSON based on the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: simulationDetailedSchema,
        thinkingConfig: { thinkingBudget: 2048 } // Allow AI to 'think' through the test steps
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText);
    
    // Format the structured log into a string for the UI
    let formattedLog = `[INFO] Test Execution Started: ${testCase.title}\n`;
    formattedLog += `[INFO] Environment: ${contextInfo.split('\n')[0]}\n`; // First line of context
    formattedLog += `--------------------------------------------------\n`;

    result.executionSteps.forEach((step: any) => {
        const timestamp = new Date().toLocaleTimeString();
        const icon = step.outcome === 'PASSED' ? '✅' : '❌';
        formattedLog += `[${timestamp}] STEP ${step.stepNumber}: ${step.actionSummary || 'Action'} ... ${step.outcome}\n`;
        formattedLog += `    > ${icon} Log: ${step.logEntry}\n`;
        formattedLog += `    > ⏱️ Duration: ${step.durationMs}ms\n\n`;
    });

    formattedLog += `--------------------------------------------------\n`;
    formattedLog += `[RESULT] ${result.overallStatus}\n`;
    formattedLog += `[ANALYSIS] ${result.finalAnalysis}`;

    return {
      status: result.overallStatus as TestStatus,
      notes: formattedLog
    };

  } catch (error) {
    console.error("Simulation failed:", error);
    return { status: 'SKIPPED', notes: '[ERROR] AI Agent Simulation Failed. Please check API Key or quotas.' };
  }
};
