const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const originalConnect = mongoose.connect;
const originalConnection = mongoose.connection;

const originalMongoUri = process.env.MONGO_URI;
const originalMongoDbUri = process.env.MONGODB_URI;

test('usa a URI do Mongo definida em MONGODB_URI quando MONGO_URI não existe', async () => {
  delete process.env.MONGO_URI;
  process.env.MONGODB_URI = 'mongodb+srv://user:pass@cluster.mongodb.net/conectavida';

  let uriUsada = '';
  mongoose.connect = async (uri) => {
    uriUsada = uri;
    return true;
  };

  const colecaoMock = {
    bulkWrite: async () => undefined,
    updateMany: async () => undefined
  };
  mongoose.connection = {
    collection: () => colecaoMock
  };

  const conectarBanco = require('../config/bancoDados');
  await conectarBanco();

  assert.equal(uriUsada, 'mongodb+srv://user:pass@cluster.mongodb.net/conectavida');

  if (originalMongoUri === undefined) delete process.env.MONGO_URI; else process.env.MONGO_URI = originalMongoUri;
  if (originalMongoDbUri === undefined) delete process.env.MONGODB_URI; else process.env.MONGODB_URI = originalMongoDbUri;
  mongoose.connect = originalConnect;
  mongoose.connection = originalConnection;
});
