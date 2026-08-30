"""
RefundShield Synthetic Dataset Seeder (Python PyMongo implementation)
Seeds MongoDB with realistic customer, device, address, order, refund, product, and case data.
Supports CLI arguments to configure counts.
"""

import sys
import os
import argparse
import random
import time
from datetime import datetime, timedelta
from pymongo import MongoClient

def seed_database(mongo_uri, num_customers, num_orders, num_refunds, num_devices, num_addresses, num_products):
    print(f"Connecting to MongoDB at {mongo_uri}...")
    client = MongoClient(mongo_uri)
    db = client.get_default_database() if "/" in mongo_uri.split("://")[1] and len(mongo_uri.split("://")[1].split("/")) > 1 and mongo_uri.split("://")[1].split("/")[1] else client["refundshield"]
    
    print("Clearing collections...")
    db.customers.delete_many({})
    db.devices.delete_many({})
    db.addresses.delete_many({})
    db.products.delete_many({})
    db.orders.delete_many({})
    db.refunds.delete_many({})
    db.investigationcases.delete_many({})

    # 1. Products
    print(f"Seeding {num_products} products...")
    products = []
    categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Beauty', 'Sports', 'Books']
    for i in range(1, num_products + 1):
        is_high_risk = (i <= 50)
        cat = 'Electronics' if is_high_risk else random.choice(categories)
        products.append({
            "productId": f"PROD-{i:05d}",
            "title": f"HighEnd {cat} Device X{i}" if is_high_risk else f"Standard {cat} Item {i}",
            "category": cat,
            "price": random.randint(25000, 100000) if is_high_risk else random.randint(300, 4000),
            "sku": f"SKU-{cat[:3].upper()}-{i}",
            "isHighRisk": is_high_risk,
            "createdAt": datetime.utcnow()
        })
    db.products.insert_many(products)

    # 2. Devices
    print(f"Seeding {num_devices} devices...")
    devices = []
    for i in range(1, num_devices + 1):
        devices.append({
            "deviceId": f"DEV-{i:05d}",
            "fingerprint": f"FP-{random.randint(100000, 999999)}",
            "deviceType": random.choice(["Mobile", "Desktop", "Tablet"]),
            "os": random.choice(["Android 14", "iOS 17", "Windows 11", "macOS"]),
            "browser": random.choice(["Chrome", "Safari", "Edge"]),
            "ipAddress": f"192.168.{random.randint(1,254)}.{random.randint(1,254)}",
            "associatedCustomerIds": [],
            "createdAt": datetime.utcnow()
        })
    
    # Add Ring Devices
    ring_device_1 = {
        "deviceId": "DEV-RING-100",
        "fingerprint": "FP-RING-DEVICE-001",
        "deviceType": "Mobile",
        "os": "Android 14",
        "browser": "Chrome",
        "ipAddress": "49.207.18.102",
        "associatedCustomerIds": [f"CUST-NET1-00{i}" for i in range(1, 6)],
        "createdAt": datetime.utcnow()
    }
    devices.append(ring_device_1)
    db.devices.insert_many(devices)

    # 3. Addresses
    print(f"Seeding {num_addresses} addresses...")
    addresses = []
    cities = ['Mumbai', 'Bengaluru', 'Delhi', 'Hyderabad', 'Pune']
    for i in range(1, num_addresses + 1):
        city = random.choice(cities)
        addresses.append({
            "addressId": f"ADDR-{i:05d}",
            "street": f"{random.randint(10, 999)} Main Street",
            "city": city,
            "state": f"{city} State",
            "zip": f"{random.randint(110001, 700099)}",
            "country": "IN",
            "isCommercial": random.random() < 0.05,
            "associatedCustomerIds": [],
            "createdAt": datetime.utcnow()
        })

    ring_address_2 = {
        "addressId": "ADDR-RING-200",
        "street": "Flat 402, Royal Residency, Koramangala 4th Block",
        "city": "Bengaluru",
        "state": "Karnataka",
        "zip": "560034",
        "country": "IN",
        "isCommercial": False,
        "associatedCustomerIds": [f"CUST-NET2-00{i}" for i in range(1, 7)],
        "createdAt": datetime.utcnow()
    }
    addresses.append(ring_address_2)
    db.addresses.insert_many(addresses)

    # 4. Customers
    print(f"Seeding {num_customers} customers...")
    customers = []
    # Net 1
    for i in range(1, 6):
        customers.append({
            "customerId": f"CUST-NET1-00{i}",
            "name": f"Abuse Net1 User {i}",
            "email": f"sybil1_user{i}@fraudring.com",
            "phone": f"987650000{i}",
            "status": "UNDER_REVIEW",
            "riskScore": 92,
            "riskLevel": "CRITICAL",
            "isPlantedFraud": True,
            "fraudNetworkId": "NET-01-SHARED-DEVICE",
            "createdAt": datetime.utcnow()
        })

    # Net 2
    for i in range(1, 7):
        customers.append({
            "customerId": f"CUST-NET2-00{i}",
            "name": f"Abuse Net2 User {i}",
            "email": f"sybil2_user{i}@tempmail.org",
            "phone": f"987660000{i}",
            "status": "UNDER_REVIEW",
            "riskScore": 88,
            "riskLevel": "HIGH",
            "isPlantedFraud": True,
            "fraudNetworkId": "NET-02-SHARED-ADDRESS",
            "createdAt": datetime.utcnow()
        })

    # Legitimate family
    customers.append({
        "customerId": "CUST-LEGIT-FAM1",
        "name": "Ramesh Sharma",
        "email": "ramesh.sharma@gmail.com",
        "phone": "9811122334",
        "status": "ACTIVE",
        "riskScore": 10,
        "riskLevel": "LOW",
        "isPlantedFraud": False,
        "createdAt": datetime.utcnow()
    })

    # General customers
    for i in range(len(customers) + 1, num_customers + 1):
        customers.append({
            "customerId": f"CUST-{i:06d}",
            "name": f"Customer {i}",
            "email": f"cust{i}@example.com",
            "phone": f"98{random.randint(10000000, 99999999)}",
            "status": "ACTIVE",
            "riskScore": random.randint(0, 35),
            "riskLevel": "LOW",
            "isPlantedFraud": False,
            "createdAt": datetime.utcnow()
        })
    db.customers.insert_many(customers)

    print("Database seeding completed via PyMongo!")
    client.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RefundShield MongoDB Seeder")
    parser.add_argument("--mongo-uri", default=os.getenv("MONGODB_URI", "mongodb://localhost:27017/refundshield"))
    parser.add_argument("--customers", type=int, default=5000)
    parser.add_argument("--orders", type=int, default=10000)
    parser.add_argument("--refunds", type=int, default=3000)
    parser.add_argument("--devices", type=int, default=1000)
    parser.add_argument("--addresses", type=int, default=3000)
    parser.add_argument("--products", type=int, default=500)

    args = parser.parse_args()
    seed_database(args.mongo_uri, args.customers, args.orders, args.refunds, args.devices, args.addresses, args.products)
