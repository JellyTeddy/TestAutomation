
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TestCase, TestStep, TestStatus } from "../types";

// Safely access process.env.API_KEY
const getApiKey = (): string => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || "";
    }
  } catch (e) {
    console.warn("process.env is not accessible.");
  }
  return "";
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const testCaseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    testCases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise, specific title for the test case in Korean (e.g. '이메일 형식이 잘못되었을 때 로그인 차단 확인')" },
          description: { type: Type.STRING, description: "Detailed objective and preconditions in Korean" },
          priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, description: "Atomic user action in Korean (e.g. '이메일 필드에 user@domain 입력')" },
                expectedResult: { type: Type.STRING, description: "Specific system response in Korean (e.g. '붉은색 테두리와 함께 경고 문구 표시')" }
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

export const generateTestCases = async (
  featureDescription: string, 
  contextInfo?: string,
  fileData?: { mimeType: string, data: string }
): Promise<Partial<TestCase>[]> => {
  try {
    const promptText = `
      You are a Senior QA Automation Engineer & Test Architect.
      Your goal is to generate highly granular, robust, and edge-case-aware test cases in Korean (한국어).

      **Target Application Context**: ${contextInfo || "General Software Application"}
      
      **Input Content (Requirement/Screen/Data)**:
      "${featureDescription}"
      
      **CRITICAL INSTRUCTIONS FOR HIGH QUALITY & GRANULARITY**:
      1. **Atomic Steps (세분화)**: Never write generic steps like "Login". Break it down explicitly.
      2. **Scenario Coverage**: Positive flows, Negative flows (validation), Edge cases, State changes.
      3. **Specific Data**: Use concrete examples in the 'action' field.
      4. **Language**: All content MUST be in natural, professional Korean (한국어).

      Generate a comprehensive list of test cases.
    `;

    const parts: any[] = [{ text: promptText }];
    if (fileData) {
      parts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.data
        }
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: parts.length > 1 ? { parts } : promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: testCaseSchema,
        systemInstruction: "You are a perfectionist QA Lead. You hate vague test cases. You define every single user interaction explicitly.",
        thinkingConfig: { thinkingBudget: 4096 }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText);
    const rawCases = parsed.testCases || [];

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
      Task: Simulate the execution of a software test case step-by-step.
      
      Context: ${contextInfo}
      Test Case: "${testCase.title}"
      Priority: ${testCase.priority}
      
      Steps to Execute:
      ${stepsText}
      
      Instructions:
      1. **Check Context**: If the context mentions a file target, simulate interactions with that file type.
      2. **Simulation Logic**: Act as if you are executing these steps. Provide realistic logs in Korean.
      3. Determine the Overall Status (PASSED, FAILED, SKIPPED).
      
      Return strictly JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: simulationDetailedSchema,
        thinkingConfig: { thinkingBudget: 2048 }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText);
    
    let formattedLog = `[INFO] Test Execution Started: ${testCase.title}\n`;
    formattedLog += `[INFO] Target: ${contextInfo.split('\n')[0]}\n`;
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
