const { Kafka } = require('kafkajs');


const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'notification-group' });

const start = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: 'orders_topic', fromBeginning: true });

  console.log('📬 NotificationService à l’écoute de orders_topic...');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const order = JSON.parse(message.value.toString());
      console.log(`📢 Nouvelle commande reçue !`);
      console.log(`🧾 Détails : Commande ID=${order.id}, Utilisateur=${order.userId}, Total=${order.total} TND`);
      
    
      console.log(`📧 Notification envoyée à l'utilisateur ${order.userId} (simulation)\n`);
    },
  });
};

start().catch(console.error);
