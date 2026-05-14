import { Component, inject } from '@angular/core';
import { CoachService } from '../../core/services/coach.service';
import { TransactionService } from '../../core/services/transaction.service';

@Component({
  selector: 'app-coach',
  imports: [],
  templateUrl: './coach.component.html',
})
export class CoachComponent {
  protected coachService = inject(CoachService);
  private txService = inject(TransactionService);

  readonly goal = this.coachService.goal;
  readonly messages = this.coachService.messages;
  readonly isLoading = this.coachService.isLoading;
  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;

  async requestAnalysis(): Promise<void> {
    await this.coachService.requestAnalysis();
  }

  get progressPercent(): number {
    const g = this.goal();
    return Math.min(Math.round((g.currentAmount / g.targetAmount) * 100), 100);
  }

  get daysLeft(): number {
    const deadline = new Date(this.goal().deadline);
    const today = new Date();
    return Math.max(0, Math.round((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  renderMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^(#{1,3})\s(.+)$/gm, (_, h, t) => `<span class="font-bold text-[#1C2833] text-base block mb-1">${t}</span>`)
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n/g, '<br>')
      .replace(/^(\d+)\.\s(.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');
  }
}
