# 🛒 E-commerce Microservices Project

Ce projet est une plateforme e-commerce développée selon une architecture microservices, avec communication via **gRPC** et gestion d'événements via **Kafka**. Il permet la consultation de produits, la création de commandes et la réception de notifications lors d’un achat.

---

## 📦 Microservices inclus

| Service              | Description                                          | Port    |
|----------------------|------------------------------------------------------|---------|
| Product Service       | Gère les produits disponibles à la vente            | 50051   |
| User Service          | Gère les informations des utilisateurs              | 50053   |
| Order Service         | Gère la création des commandes                      | 50052   |
| Notification Service  | Écoute les événements de commande via Kafka         | N/A     |
| API Gateway           | Interface REST et GraphQL pour les clients          | 3000    |

---

## ⚙️ Technologies utilisées

- Node.js
- gRPC
- Kafka (avec Zookeeper)
- REST / GraphQL (Apollo Server)
- Postman pour les tests
- Protobuf

---

## 🚀 Lancement du projet

### 1. Lancer Kafka & Zookeeper

```bash
cd kafka
./bin/windows/zookeeper-server-start.bat ./config/zookeeper.properties
./bin/windows/kafka-server-start.bat ./config/server.properties
```

### 2. Créer le topic Kafka

```bash
./bin/windows/kafka-topics.bat --create --topic orders_topic --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

### 3. Démarrer les services

```bash
cd product-service
node productService.js

cd user-service
node userService.js

cd order-service
node orderService.js

cd notification-service
node notificationService.js

cd api-gateway
node apiGateway.js
```

---

## 🧪 Tester avec Postman

Importer le fichier : `Ecommerce_Microservices_REST.postman_collection.json`

Exemples :
- `GET http://localhost:3000/products`
- `POST http://localhost:3000/orders`
```json
{
  "userId": "1",
  "productIds": ["101", "102"]
}
```

---

## 📌 Architecture

- API Gateway reçoit les requêtes REST/GraphQL
- Il communique avec les microservices via gRPC
- Lors de la création d'une commande, un message est publié dans Kafka
- Notification Service consomme l’événement et affiche une notification

---

## ✍️ Auteur

Projet développé dans le cadre d’un TP de fin d’année. Réalisé par : **[Votre Nom]**
