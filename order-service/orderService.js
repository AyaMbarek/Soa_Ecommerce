const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');


const orderProtoPath = '../protos/order.proto';
const orderProtoDef = protoLoader.loadSync(orderProtoPath);
const orderProto = grpc.loadPackageDefinition(orderProtoDef).order;


const orders = [];


const kafka = new Kafka({ clientId: 'order-service', brokers: ['localhost:9092'] });
const producer = kafka.producer();

async function sendOrderCreatedEvent(order) {
  await producer.connect();
  await producer.send({
    topic: 'orders_topic',
    messages: [{ value: JSON.stringify(order) }],
  });
  await producer.disconnect();
}

//Service gRPC
const orderService = {
  CreateOrder: async (call, callback) => {
    const { userId, productIds } = call.request;
    const total = productIds.length * 100;
    const newOrder = {
      id: uuidv4(),
      userId,
      productIds,
      total,
      status: 'pending',
    };
    orders.push(newOrder);
    await sendOrderCreatedEvent(newOrder);
    callback(null, newOrder);
  },

  GetOrder: (call, callback) => {
    const order = orders.find(o => o.id === call.request.id);
    callback(null, order || {});
  },

  ListOrdersByUser: (call, callback) => {
    const userOrders = orders.filter(o => o.userId === call.request.id);
    callback(null, { orders: userOrders });
  },
};


const server = new grpc.Server();
server.addService(orderProto.OrderService.service, orderService);
const PORT = 50052;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) return console.error('Erreur démarrage OrderService:', err);
  console.log(`✅ OrderService gRPC lancé sur le port ${port}`);
  server.start();
});
