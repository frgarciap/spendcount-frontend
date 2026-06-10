import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TransactionService } from '../../core/services/transaction.service';
import { AuthService } from '../../core/services/auth.service';
import { GoalService } from '../../core/services/goal.service';
import {
  Transaction, TransactionForm, TransactionFilter,
  TransactionType, TransactionCategory,
  ALL_CATEGORIES, INCOME_CATEGORIES, EXPENSE_CATEGORIES,
  CATEGORY_LABELS, CATEGORY_ICONS,
} from '../../core/models/transaction.model';

const EMPTY_FORM: TransactionForm = {
  type: 'expense',
  amount: null,
  date: new Date().toISOString().split('T')[0],
  category: '',
  description: '',
};

const EMPTY_FILTER: TransactionFilter = {
  type: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
};

@Component({
  selector: 'app-transactions',
  imports: [FormsModule, DatePipe],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent implements OnInit {
  private txService = inject(TransactionService);
  private authService = inject(AuthService);
  private goalService = inject(GoalService);

  readonly user = this.authService.user;
  readonly goals = this.goalService.goals;
  readonly loading = this.txService.loading;
  readonly totalIncome = this.txService.totalIncome;
  readonly totalExpenses = this.txService.totalExpenses;
  readonly balance = this.txService.balance;

  readonly CATEGORY_LABELS = CATEGORY_LABELS;
  readonly CATEGORY_ICONS = CATEGORY_ICONS;
  readonly ALL_CATEGORIES = ALL_CATEGORIES;
  readonly INCOME_CATEGORIES = INCOME_CATEGORIES;
  readonly EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

  filter: TransactionFilter = { ...EMPTY_FILTER };
  showFilters = signal(false);

  get filteredTransactions(): Transaction[] {
    return this.txService.filter(this.filter);
  }

  showForm = signal(false);
  editingId = signal<string | null>(null);
  form: TransactionForm = { ...EMPTY_FORM };
  amountDisplay = '';
  categorySearch = '';
  showCategoryDropdown = false;
  formLoading = signal(false);
  formError = signal<string | null>(null);
  deleteConfirmId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await Promise.all([this.txService.loadAll(), this.goalService.loadAll()]);
  }

  get availableCategories(): TransactionCategory[] {
    return this.form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }

  openAddForm(): void {
    this.editingId.set(null);
    this.form = { ...EMPTY_FORM, date: new Date().toISOString().split('T')[0] };
    this.amountDisplay = '';
    this.categorySearch = '';
    this.showForm.set(true);
  }

  openEditForm(tx: Transaction): void {
    this.editingId.set(tx.id);
    this.form = { type: tx.type, amount: tx.amount, date: tx.date, category: tx.category, description: tx.description ?? '' };
    this.amountDisplay = tx.amount ? tx.amount.toLocaleString('es-CO') : '';
    this.categorySearch = CATEGORY_LABELS[tx.category as TransactionCategory] ?? tx.category;
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.formError.set(null);
  }

  async saveForm(): Promise<void> {
    if (!this.form.amount || !this.form.date || !this.form.category) return;
    this.formLoading.set(true);
    this.formError.set(null);
    try {
      const id = this.editingId();
      if (id) {
        await this.txService.update(id, this.form);
      } else {
        await this.txService.add(this.form);
      }
      this.closeForm();
    } catch (err: unknown) {
      this.formError.set(err instanceof Error ? err.message : 'Error al guardar el movimiento');
    } finally {
      this.formLoading.set(false);
    }
  }

  confirmDelete(id: string): void {
    this.deleteConfirmId.set(id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  async doDelete(): Promise<void> {
    const id = this.deleteConfirmId();
    if (id) {
      await this.txService.delete(id);
      this.deleteConfirmId.set(null);
    }
  }

  resetFilters(): void {
    this.filter = { ...EMPTY_FILTER };
  }

  onTypeChange(): void {
    this.form.category = '';
    this.categorySearch = '';
  }

  get filteredStandardCategories(): { value: string; label: string; icon: string }[] {
    const q = this.categorySearch.toLowerCase();
    return this.availableCategories
      .filter(c => CATEGORY_LABELS[c].toLowerCase().includes(q))
      .map(c => ({ value: c, label: CATEGORY_LABELS[c], icon: CATEGORY_ICONS[c] }));
  }

  get filteredGoalOptions() {
    if (this.form.type !== 'expense') return [];
    const q = this.categorySearch.toLowerCase();
    return this.goals().filter(g => g.name.toLowerCase().includes(q));
  }

  selectCategory(value: string, display: string): void {
    this.form.category = value;
    this.categorySearch = display;
    this.showCategoryDropdown = false;
  }

  closeCategoryDropdown(): void {
    setTimeout(() => { this.showCategoryDropdown = false; }, 150);
  }

  getCategoryIcon(category: string): string {
    return CATEGORY_ICONS[category as TransactionCategory] ?? '🎯';
  }

  getCategoryLabel(category: string): string {
    return CATEGORY_LABELS[category as TransactionCategory] ?? category;
  }

  onAmountInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    if (!digits) {
      this.amountDisplay = '';
      this.form.amount = null;
      input.value = '';
    } else {
      const numeric = parseInt(digits, 10);
      this.amountDisplay = numeric.toLocaleString('es-CO');
      this.form.amount = numeric;
      input.value = this.amountDisplay;
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
  }

  formatCurrencyShort(amount: number): string {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(amount);
    if (abs >= 1_000_000) {
      const val = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${sign}$ ${val}M`;
    }
    if (abs >= 1_000) {
      const val = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
      return `${sign}$ ${val}K`;
    }
    return `${sign}$ ${abs.toLocaleString('es-CO')}`;
  }

  getFirstName(): string {
    const name = this.user()?.name ?? '';
    return name.split(' ')[0];
  }
}
