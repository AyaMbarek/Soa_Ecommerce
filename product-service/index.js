const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { v4: uuidv4 } = require('uuid');

const packageDef = protoLoader.loadSync('../protos/product.proto');
const productProto = grpc.loadPackageDefinition(packageDef).product;

const products = [
  { id: '1', name: 'Laptop', description: 'Gaming Laptop', price: 1200 },
  { id: '2', name: 'Smartphone', description: 'Android Phone', price: 800 }
];

const server = new grpc.Server();

server.addService(productProto.ProductService.service, {
  CreateProduct: (call, callback) => {
    const { name, description, price } = call.request;
    const product = {
      id: uuidv4(),
      name,
      description,
      price
    };
    products.push(product);
    callback(null, product);
  },
  GetProduct: (call, callback) => {
    const product = products.find(p => p.id === call.request.id);
    callback(null, product || {});
  },
  ListProducts: (_, callback) => {
    callback(null, { products });
  }
});

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('Product Service running on port 50051');
  server.start();
});
