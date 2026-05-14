import { Injectable, signal, computed } from '@angular/core';
import {
  Transaction, TransactionForm, TransactionFilter,
  TransactionCategory, CATEGORY_LABELS,
} from '../models/transaction.model';

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', type: 'income', amount: 3500000, date: '2025-05-01', category: 'salary', description: 'Salario mensual', createdAt: new Date().toISOString() },
  { id: '2', type: 'expense', amount: 850000, date: '2025-05-03', category: 'housing', description: 'Arriendo apartamento', createdAt: new Date().toISOString() },
  { id: '3', type: 'expense', amount: 180000, date: '2025-05-05', category: 'food', description: 'Mercado semanal', createdAt: new Date().toISOString() },
  { id: '4', type: 'expense', amount: 95000, date: '2025-05-07', category: 'transport', description: 'Transporte del mes', createdAt: new Date().toISOString() },
  { id: '5', type: 'income', amount: 450000, date: '2025-05-10', category: 'freelance', description: 'Proyecto diseño web', createdAt: new Date().toISOString() },
  { id: '6', type: 'expense', amount: 65000, date: '2025-05-12', category: 'health', description: 'Consulta médica', createdAt: new Date().toISOString() },
  { id: '7', type: 'expense', amount: 120000, date: '2025-05-14', category: 'entertainment', description: 'Suscripciones streaming', createdAt: new Date().toISOString() },
  { id: '8', type: 'expense', amount: 220000, date: '2025-05-16', category: 'shopping', description: 'Ropa y accesorios', createdAt: new Date().toISOString() },
  { id: '9', type: 'income', amount: 200000, date: '2025-04-05', category: 'investment', description: 'Rendimiento CDT', createdAt: new Date().toISOString() },
  { id: '10', type: 'expense', amount: 150000, date: '2025-04-10', category: 'education', description: 'Curso online', createdAt: new Date().toISOString() },
  { id: '11', type: 'income', amount: 3500000, date: '2025-04-01', category: 'salary', description: 'Salario mensual', createdAt: new Date().toISOString() },
  { id: '12', type: 'expense', amount: 850000, date: '2025-04-03', category: 'housing', description: 'Arriendo apartamento', createdAt: new Date().toISOString() },
  { id: '13', type: 'expense', amount: 175000, date: '2025-04-06', category: 'food', description: 'Mercado', createdAt: new Date().toISOString() },
  { id: '14', type: 'expense', amount: 95000, date: '2025-04-08', category: 'transport', description: 'Transporte', createdAt: new Date().toISOString() },
  { id: '15', type: 'income', amount: 3500000, date: '2025-03-01', category: 'salary', description: 'Salario mensual', createdAt: new Date().toISOString() },
  { id: '16', type: 'expense', amount: 850000, date: '2025-03-03', category: 'housing', description: 'Arriendo apartamento', createdAt: new Date().toISOString() },
  { id: '17', type: 'expense', amount: 320000, date: '2025-03-15', category: 'health', description: 'Exámenes médicos', createdAt: new Date().toISOString() },
  { id: '18', type: 'income', amount: 300000, date: '2025-03-20', category: 'gift', description: 'Regalo cumpleaños', createdAt: new Date().toISOString() },
];

const STORAGE_KEY = 'spendcount_transactions';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly _transactions = signal<Transaction[]>(this.loadFromStorage());

  readonly transactions = this._transactions.asReadonly();

  readonly totalIncome = computed(() =>
    this._transactions().filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );

  readonly totalExpenses = computed(() =>
    this._transactions().filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  readonly balance = computed(() => this.totalIncome() - this.totalExpenses());

  private loadFromStorage(): Transaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : MOCK_TRANSACTIONS;
    } catch {
      return MOCK_TRANSACTIONS;
    }
  }

  private save(transactions: Transaction[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    this._transactions.set(transactions);
  }

  add(form: TransactionForm): void {
    const transaction: Transaction = {
      id: Date.now().toString(),
      type: form.type,
      amount: form.amount!,
      date: form.date,
      category: form.category as TransactionCategory,
      description: form.description || undefined,
      createdAt: new Date().toISOString(),
    };
    this.save([transaction, ...this._transactions()]);
  }

  update(id: string, form: TransactionForm): void {
    const updated = this._transactions().map(t =>
      t.id === id
        ? { ...t, type: form.type, amount: form.amount!, date: form.date, category: form.category as TransactionCategory, description: form.description || undefined }
        : t
    );
    this.save(updated);
  }

  delete(id: string): void {
    this.save(this._transactions().filter(t => t.id !== id));
  }

  filter(filters: TransactionFilter): Transaction[] {
    return this._transactions().filter(t => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  getByMonth(): { month: string; income: number; expenses: number }[] {
    const map = new Map<string, { income: number; expenses: number }>();
    this._transactions().forEach(t => {
      const month = t.date.substring(0, 7);
      if (!map.has(month)) map.set(month, { income: 0, expenses: 0 });
      const entry = map.get(month)!;
      if (t.type === 'income') entry.income += t.amount;
      else entry.expenses += t.amount;
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  getByCategory(): { category: string; label: string; amount: number; type: string }[] {
    const map = new Map<string, { label: string; amount: number; type: string }>();
    this._transactions().forEach(t => {
      if (!map.has(t.category)) {
        map.set(t.category, { label: CATEGORY_LABELS[t.category], amount: 0, type: t.type });
      }
      map.get(t.category)!.amount += t.amount;
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }
}
