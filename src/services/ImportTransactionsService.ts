import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Transform } from 'stream';

import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';
import uploadConfig from '../config/upload';
import CreateTransactionService from './CreateTransactionService';

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
    const transactions = await this.createTransactionsFromFile(file);

    await this.deleteFileFromDisk(file);

    return transactions;
  }

  private async createTransactionsFromFile(
    file: string,
  ): Promise<Transaction[]> {
    const createTransaction = new CreateTransactionService();

    function saveInDB(transactions: Transaction[]): Transform {
      return new Transform({
        readableObjectMode: true,
        writableObjectMode: true,
        transform(chunk, encoding, callback): void {
          const { title, type, value, category } = chunk as TransactionFile;
          createTransaction
            .execute({
              title,
              type,
              value: Number(value),
              category,
            })
            .then(transaction => {
              transactions.push(transaction);
              callback(null, transaction);
            });
        },
      });
    }

    async function createRecords(): Promise<Transaction[]> {
      const transactions: Transaction[] = [];
      return new Promise(resolve => {
        fs.createReadStream(file)
          .pipe(
            csv({
              mapValues: ({ value }) => value.trim(),
              mapHeaders: ({ header }) => header.trim(),
            }),
          )
          .pipe(saveInDB(transactions))
          .on('finish', () => {
            resolve(transactions);
          });
      });
    }
    const transactions = await createRecords();
    return transactions;
  }

  private async deleteFileFromDisk(file: string): Promise<void> {
    const isFileInDisk = await fs.promises.stat(file);
    if (isFileInDisk) {
      await fs.promises.unlink(file);
    }
  }
}

export default ImportTransactionsService;
