import fs from 'fs';
import path from 'path';
import csv from 'csv-parse';

import { getRepository, In, getCustomRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';
import uploadConfig from '../config/upload';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  filename: string;
  mimetype: string;
}

interface TransactionFile {
  title: string;
  type: 'income' | 'outcome';
  value: string;
  category: string;
}

class ImportTransactionsService {
  async execute({ filename, mimetype }: Request): Promise<Transaction[]> {
    if (mimetype !== 'text/csv') {
      throw new AppError('The file must be a CSV');
    }
    const file = path.join(uploadConfig.directory, filename);

    const parses = csv({
      from_line: 2,
    });

    const readStream = fs.createReadStream(file);

    const parseCSV = readStream.pipe(parses);

    const categoriesCsv: string[] = [];
    const transactionsCsv: TransactionFile[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categoriesCsv.push(category);
      transactionsCsv.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categories = await this.handleCategories(categoriesCsv);
    const transactions = await this.handleTransactions(
      transactionsCsv,
      categories,
    );

    await this.deleteFileFromDisk(file);

    return transactions;
  }

  private async handleTransactions(
    transactionsCsv: TransactionFile[],
    categories: Category[],
  ): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const transactions = transactionsRepository.create(
      transactionsCsv.map(({ title, type, value, category }) => ({
        title,
        type,
        value: Number(value),
        category_id: categories.find(
          ({ title: categoryTitle }) => categoryTitle === category,
        )?.id,
      })),
    );

    await transactionsRepository.save(transactions);

    return transactions;
  }

  private async handleCategories(categoriesCsv: string[]): Promise<Category[]> {
    const categoriesRepository = getRepository(Category);
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categoriesCsv),
      },
    });

    const existentCategoryTitles = existentCategories.map(
      category => category.title,
    );

    const categoriesToAdd = this.getCategoriesToAdd(
      categoriesCsv,
      existentCategoryTitles,
    );

    const addedCategories = categoriesRepository.create(
      categoriesToAdd.map(title => ({
        title,
      })),
    );
    await categoriesRepository.save(addedCategories);

    return [...addedCategories, ...existentCategories];
  }

  private getCategoriesToAdd(
    categories: string[],
    existentCategories: string[],
  ): string[] {
    const lookup = new Set<string>();
    categories.forEach(category => {
      lookup.add(category);
    });
    existentCategories.forEach(category => {
      lookup.delete(category);
    });
    return Array.from(lookup);
  }

  private async deleteFileFromDisk(file: string): Promise<void> {
    const isFileInDisk = await fs.promises.stat(file);
    if (isFileInDisk) {
      await fs.promises.unlink(file);
    }
  }
}

export default ImportTransactionsService;
