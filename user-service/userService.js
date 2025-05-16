const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const userProtoDefinition = protoLoader.loadSync(
  path.join(__dirname, '../protos/user.proto'),
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [
      path.join(__dirname, '../protos'),
      path.join(__dirname, '../node_modules/google-proto-files')
    ]
  }
);
const userProto = grpc.loadPackageDefinition(userProtoDefinition).user;


const users = [];


const server = new grpc.Server();


server.addService(userProto.UserService.service, {
  CreateUser: (call, callback) => {
    const { name, email } = call.request;
    const user = {
      id: uuidv4(),
      name,
      email
    };
    users.push(user);
    callback(null, user);
  },

  GetUser: (call, callback) => {
    const { id } = call.request;
    const user = users.find(u => u.id === id);
    callback(null, user || {});
  },

  ListUsers: (_, callback) => {
    callback(null, { users });
  }
});


const bindServer = () => {
  return new Promise((resolve, reject) => {
    server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), (error, port) => {
      if (error) {
        reject(error);
      } else {
        console.log(`User Service running on port ${port}`);
        resolve();
      }
    });
  });
};


bindServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
