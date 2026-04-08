"""
database.py — MongoDB connection
"""
import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME   = os.getenv("DB_NAME", "resume_ai")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

try:
    # Ping to confirm connection
    client.admin.command("ping")
    print(f"✅ Connected to MongoDB at {MONGO_URI}")
except ConnectionFailure:
    print("⚠️  WARNING: Could not connect to MongoDB. Ensure MongoDB is running.")

db = client[DB_NAME]

# Ensure indexes
db.users.create_index("email", unique=True)
db.resumes.create_index("user_id")
db.resumes.create_index("created_at")
