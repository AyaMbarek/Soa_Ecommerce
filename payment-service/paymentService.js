const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { v4: uuidv4 } = require('uuid');


const paymentProtoPath = '../protos/payment.proto';
const packageDef = protoLoader.loadSync(paymentProtoPath, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const paymentProto = grpc.loadPackageDefinition(packageDef).payment;

// Implémentation du service Payment
const paymentService = {
  ProcessPayment: (call, callback) => {
    const { orderId, amount, method } = call.request;

    // Simulation : succès si amount > 0, sinon échec
    let status = 'failed';
    if (amount > 0) status = 'success';

    const response = {
      paymentId: uuidv4(),
      status,
    };
    callback(null, response);
  },
};

// Démarrage serveur gRPC
const server = new grpc.Server();
server.addService(paymentProto.PaymentService.service, paymentService);
const PORT = 50054;

server.bindAsync(`0.0.0.0:${PORT}`, grpc.ServerCredentials.createInsecure(), (err) => {
  if (err) {
    console.error("Erreur démarrage PaymentService:", err);
    return;
  }
  console.log(`✅ PaymentService lancé sur le port ${PORT}`);
  server.start();
});
