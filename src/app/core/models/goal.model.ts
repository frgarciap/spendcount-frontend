export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
  category: string;
  description?: string;
}

export interface AiMessage {
  id: string;
  role: 'assistant';
  content: string;
  timestamp: string;
  isLoading?: boolean;
}
