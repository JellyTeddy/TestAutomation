
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TestCase, TestStep, TestStatus } from "../types";

// Safely access process.env.API_KEY to avoid crashes in environments where process is undefined (like browser client-side)
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
      1. **Atomic Steps (세분화)**: Never write generic steps like "Login". Break it down:
         - Bad: "로그인한다."
         - Good: 
           1. "아이디 입력란 클릭" -> "커서가 깜빡임"
           2. "유효하지 않은 이메일(test@@com) 입력" -> "입력됨"
           3. "비밀번호 입력란에 '1234' 입력" -> "마스킹 처리되어 표시됨"
           4. "로그인 버튼 클릭" -> "에러 메시지 '이메일 형식을 확인해주세요' 노출"
      
      2. **Scenario Coverage (시나리오 범위)**:
         - **Positive (Happy Path)**: The ideal success flow.
         - **Validation (Negative)**: Empty fields, invalid formats, exceeding character limits.
         - **Edge Cases**: Network disconnection simulation (if applicable), rapid double-clicking, special characters.
         - **State Changes**: Loading states (spinners), disabled buttons, active states.

      3. **Specific Data**: Use concrete examples in the 'action' field (e.g., instead of "enter name", use "Enter '홍길동'").

      4. **Language**: All Titles, Descriptions, Actions, and Expected Results MUST be in natural, professional **Korean (한국어)**.

      Generate a comprehensive list of test cases based on the provided input.
    `;

    // Construct request parts
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
      model: 'gemini-2.5-flash',
      contents: parts.length > 1 ? parts : promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: testCaseSchema,
        systemInstruction: "You are a perfectionist QA Lead. You hate vague test cases. You define every single user interaction explicitly.",
        thinkingConfig: { thinkingBudget: 4096 } // Increased budget for deeper scenario analysis
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
      1. **Check Credentials (CRITICAL)**:
         - Review the Context provided above.
         - If the Test Case steps require logging in (e.g. "Enter ID", "Sign in") AND the Context says "Valid ID: (Not Provided)" or "Valid Password: (Not Provided)", you MUST immediately stop.
         - In this case, set 'overallStatus' to 'SKIPPED' and 'finalAnalysis' to "Skipped test because valid login credentials were not provided in the setup."
      
      2. **Simulation**:
         - If credentials are present (or not needed), act as if you are executing these steps on the real application.
         - Use the 'Thinking' process to simulate the state of the application at each step.
      
      3. **For each step**:
         - Simulate the action.
         - Verify if the expected result is met.
         - Generate a realistic execution log (in Korean).
         - Assign a duration (ms).
         
      4. **Failure Logic**:
         - Introduce realistic failures (e.g., Network Timeout, Element Not Visible, 500 Internal Server Error) with a ~15% probability for 'Medium'/'High' priority cases, or if the test case logic is inherently flawed.
         - If a step fails, stop execution of subsequent steps.
      
      5. Determine the Overall Status (PASSED, FAILED, SKIPPED).
      
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
