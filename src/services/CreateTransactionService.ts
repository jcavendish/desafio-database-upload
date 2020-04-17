import { getRepository, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    await this.validateBalance(type, value);
    const categoryEntity = await this.getCategory(category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: categoryEntity.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }

  private async validateBalance(
    type: 'income' | 'outcome',
    value: number,
  ): Promise<void> {
    if (type === 'outcome') {
      const repository = getCustomRepository(TransactionsRepository);
      const balance = await repository.getBalance();
      if (balance.total < value) {
        throw new AppError('Insuficient funds');
      }
    }
  }

  private async getCategory(title: string): Promise<Category> {
    const categoriesRepository = getRepository(Category);
    const foundCategory = await categoriesRepository.findOne({
      title,
    });

    if (!foundCategory) {
      const category = categoriesRepository.create({ title });
      await categoriesRepository.save(category);
      return category;
    }
    return foundCategory;
  }
}

export default CreateTransactionService;
