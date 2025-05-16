
const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const bodyParser = require('body-parser');
const cors = require('cors');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { Kafka } = require('kafkajs');

const app = express();
app.use(cors());
app.use(bodyParser.json());


const loadProto = (filePath, includeDirs = []) =>
  grpc.loadPackageDefinition(
    protoLoader.loadSync(filePath, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs,
    })
  );


const productProto = loadProto(
  path.join(__dirname, '../protos/product.proto'),
  [path.join(__dirname, '../protos')]
).product;


const orderProto = loadProto(
  path.join(__dirname, '../protos/order.proto'),
  [path.join(__dirname, '../protos')]
).order;


const userProto = loadProto(
  path.join(__dirname, '../protos/user.proto'),
  [
    path.join(__dirname, '../protos'),
    path.join(__dirname, '../node_modules/google-proto-files'),
  ]
).user;


const productClient = new productProto.ProductService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);
const orderClient = new orderProto.OrderService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);
const userClient = new userProto.UserService(
  'localhost:50053',
  grpc.credentials.createInsecure()
);


const kafka = new Kafka({ clientId: 'api-gateway', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function sendKafkaEvent(topic, payload) {
  try {
    await producer.connect();
    await producer.send({ topic, messages: [{ value: JSON.stringify(payload) }] });
    await producer.disconnect();
  } catch (error) {
    console.error('Erreur envoi Kafka:', error);
  }
}




app.post('/products', (req, res) => {
  const { name, description, price } = req.body;
  productClient.CreateProduct({ name, description, price }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message || err });
    res.json(response);
  });
});

app.get('/products', (req, res) => {
  productClient.ListProducts({}, (err, response) => {
    if (err) return res.status(500).json({ error: err.message || err });
    res.json(response.products);
  });
});

app.get('/products/:id', (req, res) => {
  productClient.GetProduct({ id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message || err });
    res.json(response);
  });
});


app.post('/orders', (req, res) => {
  const { userId, productIds } = req.body;
  orderClient.CreateOrder({ userId, productIds }, async (err, order) => {
    if (err) return res.status(500).json({ error: err.message || err });
    await sendKafkaEvent('orders_topic', order);
    res.json(order);
  });
});

app.get('/orders/:id', (req, res) => {
  orderClient.GetOrder({ id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message || err });
    res.json(response);
  });
});


app.get('/users/:id', (req, res) => {
  userClient.GetUser({ id: req.params.id }, (err, response) => {
    if (err) return res.status(500).json({ error: err.message || err });
    res.json(response);
  });
});


const typeDefs = `#graphql
  type Product {
    id: String!
    name: String!
    description: String!
    price: Float!
  }

  type Order {
    id: String!
    userId: String!
    productIds: [String!]!
    total: Float!
    status: String!
  }

  type User {
    id: String!
    name: String!
    email: String!
  }

  type Query {
    products: [Product]
    order(id: String!): Order
    user(id: String!): User
  }

  type Mutation {
    createOrder(userId: String!, productIds: [String!]!): Order
    createProduct(name: String!, description: String!, price: Float!): Product
  }
`;

const resolvers = {
  Query: {
    products: () =>
      new Promise((resolve, reject) => {
        productClient.ListProducts({}, (err, response) =>
          err ? reject(err) : resolve(response.products)
        );
      }),
    order: (_, { id }) =>
      new Promise((resolve, reject) => {
        orderClient.GetOrder({ id }, (err, response) =>
          err ? reject(err) : resolve(response)
        );
      }),
    user: (_, { id }) =>
      new Promise((resolve, reject) => {
        userClient.GetUser({ id }, (err, response) =>
          err ? reject(err) : resolve(response)
        );
      }),
  },
  Mutation: {
    createOrder: (_, { userId, productIds }) =>
      new Promise((resolve, reject) => {
        orderClient.CreateOrder({ userId, productIds }, async (err, order) => {
          if (err) return reject(err);
          await sendKafkaEvent('orders_topic', order);
          resolve(order);
        });
      }),
    createProduct: (_, { name, description, price }) =>
      new Promise((resolve, reject) => {
        productClient.CreateProduct({ name, description, price }, (err, product) => {
          if (err) return reject(err);
          resolve(product);
        });
      }),
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

(async () => {
  await server.start();
  app.use('/graphql', expressMiddleware(server));

  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`🚀 API Gateway lancé sur http://localhost:${PORT}`);
  });
})();
