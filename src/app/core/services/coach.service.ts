import { Injectable, signal } from '@angular/core';
import { FinancialGoal, AiMessage } from '../models/goal.model';
import { TransactionService } from './transaction.service';
import { inject } from '@angular/core';

const MOCK_GOAL: FinancialGoal = {
  id: '1',
  name: 'Fondo de emergencia',
  targetAmount: 10000000,
  currentAmount: 4150000,
  deadline: '2025-12-31',
  icon: '🛡️',
  category: 'Ahorro',
  description: 'Tener 3 meses de gastos guardados como colchón financiero',
};

const AI_RESPONSES = [
  `📊 **Análisis de tu situación financiera:**

Tu tasa de ahorro actual es del **{savingsRate}%**, lo cual es {savingsRating}.

**Puntos positivos:**
- Mantienes ingresos estables por salario
- Tu balance mensual es positivo

**Oportunidades de mejora:**
- Tus gastos en entretenimiento y compras representan el {entertainmentPct}% de tus egresos
- Podrías automatizar transferencias al fondo de emergencia al inicio del mes

**Meta actual:** A este ritmo alcanzarás tu fondo de emergencia en aproximadamente **{monthsLeft} meses** (objetivo: {deadline}).

💡 *Consejo:* Considera destinar al menos el 20% de cada ingreso directamente al fondo de emergencia.`,

  `🎯 **Revisión de tu meta financiera:**

**Fondo de emergencia:** {currentAmount} / {targetAmount} ({progress}%)

Con base en tus patrones de gasto, te recomiendo:

1. **Reducir gastos variables** como entretenimiento y compras en un 15%
2. **Incrementar ingresos alternativos** — ya tienes experiencia en freelance
3. **Revisar suscripciones** que no uses activamente

Al aplicar estos cambios podrías ahorrar adicional ~{potentialSavings} mensuales y alcanzar tu meta más rápido.`,
];

@Injectable({ providedIn: 'root' })
export class CoachService {
  private txService = inject(TransactionService);

  readonly goal = signal<FinancialGoal>(MOCK_GOAL);
  readonly messages = signal<AiMessage[]>([]);
  readonly isLoading = signal(false);

  async requestAnalysis(): Promise<void> {
    this.isLoading.set(true);

    const income = this.txService.totalIncome();
    const expenses = this.txService.totalExpenses();
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    const savingsRating = savingsRate >= 20 ? 'excelente' : savingsRate >= 10 ? 'bueno' : 'mejorable';
    const goal = this.goal();
    const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
    const potentialSavings = Math.round((expenses * 0.15) / 1000) * 1000;

    const template = AI_RESPONSES[this.messages().length % AI_RESPONSES.length];
    const content = template
      .replace('{savingsRate}', savingsRate.toString())
      .replace('{savingsRating}', savingsRating)
      .replace('{entertainmentPct}', '18')
      .replace('{monthsLeft}', '4')
      .replace('{deadline}', goal.deadline)
      .replace('{currentAmount}', this.formatCurrency(goal.currentAmount))
      .replace('{targetAmount}', this.formatCurrency(goal.targetAmount))
      .replace('{progress}', progress.toString())
      .replace('{potentialSavings}', this.formatCurrency(potentialSavings));

    await new Promise(r => setTimeout(r, 1800));

    this.messages.update(msgs => [
      ...msgs,
      {
        id: Date.now().toString(),
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
    this.isLoading.set(false);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }
}
