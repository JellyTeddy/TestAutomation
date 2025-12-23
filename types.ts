
export type TestStatus = 'IDLE' | 'PASSED' | 'FAILED' | 'SKIPPED';

export interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  preconditions?: string; // 추가: 테스트 시작 전 상태
  testData?: string;      // 추가: 필요한 테스트 데이터 (ID/PW 등 구체적 정보)
  category?: string;      // 추가: Functional, UI, Edge Case, Security 등
  steps: TestStep[];
  priority: 'Low' | 'Medium' | 'High';
}

export type Role = 'ADMIN' | 'MEMBER' | 'OBSERVER';

export interface Sprint {
  id: string;
  name: string;
  startDate: string; // ISO String
  endDate: string;   // ISO String
}

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  cases: TestCase[];
  sprints?: Sprint[]; 
  activeSprintId?: string; 
  permissions?: Record<string, Role>; 
  issuePrefix?: string; 
  nextIssueNumber?: number; 
  targetConfig?: {
    appType: 'WEB' | 'FILE' | 'DESKTOP';
    appAddress: string;
    fileName?: string;
    fileData?: string; 
    validId?: string; 
    validPassword?: string; 
    executionMode?: 'MANUAL' | 'AUTOMATED';
  };
}

export interface TestResult {
  caseId: string;
  status: TestStatus;
  notes?: string;
  timestamp: string;
}

export interface TestRun {
  id: string;
  suiteId: string;
  suiteName: string;
  startTime: string;
  endTime?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  results: Record<string, TestResult>; 
}

export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  image?: string; 
  timestamp: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string; 
  size: number; 
  data: string; 
}

export interface Issue {
  id: string;
  suiteId: string; 
  sprintId?: string; 
  key: string; 
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee?: string; 
  resolver?: string; 
  reopenCount?: number; 
  createdAt: string;
  dueDate?: string; 
  comments?: Comment[];
  attachments?: Attachment[]; 
}

export interface Notification {
  id: string;
  recipientId: string; 
  message: string;
  type: 'ASSIGNMENT' | 'SYSTEM';
  read: boolean;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string; 
  jobRole?: string; 
}

export type ViewState = 'DASHBOARD' | 'SUITES' | 'RUNNER' | 'HISTORY' | 'ISSUES' | 'NOTIFICATIONS' | 'MY_PAGE' | 'MANAGE_ACCOUNTS' | 'MANAGE_PROJECTS';
