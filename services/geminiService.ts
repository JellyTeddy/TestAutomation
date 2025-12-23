
import { GoogleGenAI, Type } from "@google/genai";
import { TestCase, TestStep, TestStatus } from "../types";

// Always initialize the client with process.env.API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const testCaseSchema = {
  type: Type.OBJECT,
  properties: {
    testCases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "테스트 케이스 제목 (한글)" },
          description: { type: Type.STRING, description: "테스트 목적 설명 (한글)" },
          preconditions: { type: Type.STRING, description: "테스트 수행 전 필수 요구 사항/상태 (한글)" },
          testData: { type: Type.STRING, description: "테스트에 필요한 구체적인 입력 데이터 예시 (한글)" },
          category: { type: Type.STRING, description: "테스트 유형 (Functional, UI, Logic, Edge Case 등)" },
          priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, description: "원자적 사용자 행동 (한글)" },
                expectedResult: { type: Type.STRING, description: "예상되는 시스템 반응 (한글)" }
              },
              required: ["action", "expectedResult"]
            }
          }
        },
        required: ["title", "priority", "steps", "category"]
      }
    }
  }
};

const simulationDetailedSchema = {
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
          logEntry: { type: Type.STRING, description: "기술적 관찰 기록 (한글)" },
          durationMs: { type: Type.INTEGER }
        },
        required: ["stepNumber", "outcome", "logEntry"]
      }
    },
    finalAnalysis: { type: Type.STRING, description: "결과 요약 및 실패 시 원인 분석 (한글)" }
  },
  required: ["overallStatus", "executionSteps", "finalAnalysis"]
};

export interface GenerationOptions {
  focusArea: 'HAPPY_PATH' | 'EDGE_CASES' | 'SECURITY' | 'FULL_COVERAGE';
  complexity: 'SIMPLE' | 'DETAILED';
}

export const generateTestCases = async (
  featureDescription: string, 
  contextInfo?: string,
  options?: GenerationOptions,
  screenshot?: { mimeType: string, data: string }
): Promise<Partial<TestCase>[]> => {
  try {
    const focusDescriptions = {
      HAPPY_PATH: "정상적인 핵심 비즈니스 로직(Happy Path)을 검증하는 데 집중하세요.",
      EDGE_CASES: "경계값 분석, 잘못된 입력, 네트워크 단절 등 예외 상황과 에러 핸들링을 검증하세요.",
      SECURITY: "인증, 권한 부여, SQL 인젝션, 데이터 노출 등 보안 취약점을 검증하세요.",
      FULL_COVERAGE: "UI 구성 요소부터 핵심 로직까지 전체적인 커버리지를 확보하세요."
    };

    const promptText = `
      당신은 시니어 QA 자동화 엔지니어 및 테스트 설계 전문가입니다. 
      아래 제공된 기능 설명과 컨텍스트를 바탕으로, 정교하고 세분화된 테스트 케이스를 생성하세요.

      **애플리케이션 환경**: ${contextInfo || "일반 소프트웨어"}
      **테스트 집중 영역**: ${options ? focusDescriptions[options.focusArea] : "전체적인 기능 검증"}
      **상세 수준**: ${options?.complexity === 'DETAILED' ? "모든 단계를 매우 원자적으로 나누고 테스트 데이터와 사전 조건을 상세히 명시하세요." : "명확하고 간결하게 작성하세요."}
      
      **입력 요구사항**:
      "${featureDescription}"
      
      **작성 원칙**:
      1. 모든 내용은 반드시 **한국어**로 작성하세요.
      2. 'steps'의 'action'은 사용자가 실제 무엇을 클릭하거나 입력해야 하는지 구체적으로 기술하세요.
      3. 'testData'에는 테스트에 쓰일 수 있는 샘플 값(예: 'admin123', 'invalid-email')을 포함하세요.
      4. 스크린샷 이미지가 제공된 경우, 이미지 속의 UI 요소(버튼 텍스트, 입력창 레이블 등)를 정확히 참조하세요.
    `;

    const contents: any = {
      parts: [
        { text: promptText }
      ]
    };

    if (screenshot) {
      contents.parts.push({
        inlineData: {
          mimeType: screenshot.mimeType,
          data: screenshot.data
        }
      });
    }

    // Call generateContent with both model name and prompt as per guidelines.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: testCaseSchema,
        systemInstruction: "당신은 완벽주의적인 QA 팀장입니다. 모호한 테스트 케이스를 싫어하며, 재현 가능한 아주 구체적인 단계를 설계합니다.",
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
      preconditions: rc.preconditions || "",
      testData: rc.testData || "",
      category: rc.category || "General",
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
      당신은 자율 테스트 에이전트입니다. 주어진 테스트 케이스를 실제 시스템에서 수행하는 것처럼 단계별로 시뮬레이션하세요.
      
      환경 정보: ${contextInfo}
      테스트 케이스: "${testCase.title}"
      우선순위: ${testCase.priority}
      사전 조건: ${testCase.preconditions || "없음"}
      테스트 데이터: ${testCase.testData || "없음"}
      
      수행 단계:
      ${stepsText}
      
      **수행 지침**:
      1. 각 단계를 실제로 수행하는 것처럼 상세한 로그를 한국어로 생성하세요.
      2. 사전 조건이 충족되지 않았거나 데이터가 올바르지 않은 경우 실패로 처리할 수 있습니다.
      3. 최종 분석에는 이 테스트가 성공했는지, 실패했다면 어떤 부분에서 문제가 발생했는지(가상 분석)를 포함하세요.
    `;

    // Call generateContent with both model name and prompt as per guidelines.
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
    
    let formattedLog = `[INFO] 테스트 시뮬레이션 시작: ${testCase.title}\n`;
    formattedLog += `[INFO] 타겟 환경: ${contextInfo.split('\n')[0]}\n`;
    formattedLog += `--------------------------------------------------\n`;

    result.executionSteps.forEach((step: any) => {
        const timestamp = new Date().toLocaleTimeString();
        const icon = step.outcome === 'PASSED' ? '✅' : '❌';
        formattedLog += `[${timestamp}] 단계 ${step.stepNumber}: ${step.actionSummary || '실행'} ... ${step.outcome}\n`;
        formattedLog += `    > ${icon} 로그: ${step.logEntry}\n`;
        formattedLog += `    > ⏱️ 소요 시간: ${step.durationMs}ms\n\n`;
    });

    formattedLog += `--------------------------------------------------\n`;
    formattedLog += `[결과] ${result.overallStatus}\n`;
    formattedLog += `[분석] ${result.finalAnalysis}`;

    return {
      status: result.overallStatus as TestStatus,
      notes: formattedLog
    };

  } catch (error) {
    console.error("Simulation failed:", error);
    return { status: 'SKIPPED', notes: '[에러] AI 에이전트 시뮬레이션 중 오류가 발생했습니다. API 키 혹은 할당량을 확인하세요.' };
  }
};
