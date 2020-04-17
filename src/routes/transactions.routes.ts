import { Router } from 'express';
import { getCustomRepository } from 'typeorm';

import multer from 'multer';
import uploadConfig from '../config/upload';
import CreateTransactionService from '../services/CreateTransactionService';
import TransactionsRepository from '../repositories/TransactionsRepository';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

const transactionsRouter = Router();
const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const repository = getCustomRepository(TransactionsRepository);
  const transactions = await repository.find();
  const balance = await repository.getBalance();

  return response.json({ transactions, balance });
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;
  const createTransaction = new CreateTransactionService();
  const transaction = await createTransaction.execute({
    title,
    value,
    type,
    category,
  });

  return response.json(transaction);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;
  const deleteTransaction = new DeleteTransactionService();
  await deleteTransaction.execute(id);

  response.sendStatus(204);
});

transactionsRouter.post(
  '/import',
  upload.single('file'),
  async (request, response) => {
    const { filename, mimetype } = request.file;
    const importTransaction = new ImportTransactionsService();
    const transactions = await importTransaction.execute({
      filename,
      mimetype,
    });

    return response.json(transactions);
  },
);

export default transactionsRouter;
