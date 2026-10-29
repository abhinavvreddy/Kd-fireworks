import logging
import datetime
from bson import ObjectId
from config import Config

logger = logging.getLogger("kanakadurga_database")

# In-memory document storage mock for testing when MongoDB Atlas URI is not yet configured
class MockCollection:
    def __init__(self, name):
        self.name = name
        self.docs = []

    def create_index(self, keys, unique=False, sparse=False):
        pass

    @staticmethod
    def _matches_filter(doc, filter_dict):
        if not filter_dict:
            return True
        for k, v in filter_dict.items():
            if k == "$or":
                if not any(MockCollection._matches_filter(doc, sub) for sub in v):
                    return False
            elif k == "$and":
                if not all(MockCollection._matches_filter(doc, sub) for sub in v):
                    return False
            elif k == "_id":
                if str(doc.get("_id")) != str(v):
                    return False
            elif isinstance(v, dict):
                doc_val = doc.get(k)
                for op, op_val in v.items():
                    if op == "$gte":
                        if doc_val is None or doc_val < op_val:
                            return False
                    elif op == "$gt":
                        if doc_val is None or doc_val <= op_val:
                            return False
                    elif op == "$lte":
                        if doc_val is None or doc_val > op_val:
                            return False
                    elif op == "$lt":
                        if doc_val is None or doc_val >= op_val:
                            return False
                    elif op == "$ne":
                        if doc_val == op_val:
                            return False
                    elif op == "$in":
                        if doc_val not in op_val:
                            return False
                    elif op == "$nin":
                        if doc_val in op_val:
                            return False
                    else:
                        if doc_val != v:
                            return False
            else:
                if doc.get(k) != v:
                    return False
        return True

    def find_one(self, filter_dict):
        for doc in self.docs:
            if self._matches_filter(doc, filter_dict):
                return dict(doc)
        return None

    def find(self, filter_dict=None, sort=None, limit=0):
        filter_dict = filter_dict or {}
        results = [dict(doc) for doc in self.docs if self._matches_filter(doc, filter_dict)]
        if sort:
            for field, order in reversed(sort):
                results.sort(key=lambda d: d.get(field, 0), reverse=(order == -1))
        if limit > 0:
            results = results[:limit]
        return results

    def insert_one(self, doc):
        d = dict(doc)
        if "_id" not in d:
            d["_id"] = ObjectId()
        self.docs.append(d)
        class InsertResult:
            inserted_id = d["_id"]
        return InsertResult()

    def update_one(self, filter_dict, update_dict):
        for i, doc in enumerate(self.docs):
            if self._matches_filter(doc, filter_dict):
                # Apply $set
                if "$set" in update_dict:
                    for k, v in update_dict["$set"].items():
                        doc[k] = v
                # Apply $inc
                if "$inc" in update_dict:
                    for k, v in update_dict["$inc"].items():
                        doc[k] = doc.get(k, 0) + v
                self.docs[i] = doc
                class UpdateResult:
                    matched_count = 1
                    modified_count = 1
                return UpdateResult()

        class UpdateResult:
            matched_count = 0
            modified_count = 0
        return UpdateResult()

    def update_many(self, filter_dict, update_dict):
        matched = 0
        modified = 0
        for i, doc in enumerate(self.docs):
            if self._matches_filter(doc, filter_dict):
                matched += 1
                if "$set" in update_dict:
                    for k, v in update_dict["$set"].items():
                        doc[k] = v
                if "$inc" in update_dict:
                    for k, v in update_dict["$inc"].items():
                        doc[k] = doc.get(k, 0) + v
                self.docs[i] = doc
                modified += 1
        class UpdateResult:
            matched_count = matched
            modified_count = modified
        return UpdateResult()

    def delete_one(self, filter_dict):
        for i, doc in enumerate(self.docs):
            if self._matches_filter(doc, filter_dict):
                del self.docs[i]
                class DeleteResult:
                    deleted_count = 1
                return DeleteResult()
        class DeleteResult:
            deleted_count = 0
        return DeleteResult()

    def delete_many(self, filter_dict):
        before = len(self.docs)
        self.docs = [d for d in self.docs if not self._matches_filter(d, filter_dict)]
        class DeleteResult:
            deleted_count = before - len(self.docs)
        return DeleteResult()

    def count_documents(self, filter_dict=None):
        return len(self.find(filter_dict or {}))

class Database:
    _instance = None

    def __init__(self):
        self.client = None
        self.db = None
        self.is_connected = False
        self._collections = {}

        if Config.MONGODB_URI:
            try:
                from pymongo import MongoClient
                kwargs = {"serverSelectionTimeoutMS": 5000}
                try:
                    import certifi
                    kwargs["tlsCAFile"] = certifi.where()
                except Exception:
                    pass

                self.client = MongoClient(Config.MONGODB_URI, **kwargs)
                # Verify connection
                self.client.admin.command('ping')
                self.db = self.client[Config.MONGODB_DATABASE]
                self.is_connected = True
                logger.info(f"Connected to MongoDB Atlas: {Config.MONGODB_DATABASE}")
            except Exception as e:
                logger.warning(f"Could not connect to MongoDB Atlas: {e}. Falling back to in-memory store.")
                self.is_connected = False
        else:
            logger.info("No MONGODB_URI provided. Initialized in-memory storage engine.")

    def get_collection(self, name):
        if self.is_connected and self.db is not None:
            return self.db[name]
        if name not in self._collections:
            self._collections[name] = MockCollection(name)
        return self._collections[name]

    def init_indexes(self):
        """Initializes critical schema indexes for safety and performance"""
        users = self.get_collection("users")
        users.create_index("email", unique=True, sparse=True)
        users.create_index("verifiedPhone", unique=True, sparse=True)
        users.create_index("phone", unique=True, sparse=True)
        users.create_index("googleSubject", unique=True, sparse=True)

        communities = self.get_collection("communities")
        communities.create_index("name", unique=True)
        communities.create_index("isActive")

        products = self.get_collection("products")
        products.create_index("sku", unique=True)
        products.create_index("category")
        products.create_index("isActive")
        products.create_index("isFeatured")

        orders = self.get_collection("orders")
        orders.create_index("orderNumber", unique=True)
        orders.create_index("userId")
        orders.create_index("communityId")
        orders.create_index("orderStatus")
        orders.create_index("createdAt")

        order_events = self.get_collection("orderEvents")
        order_events.create_index("orderId")
        order_events.create_index("timestamp")

        inventory_events = self.get_collection("inventoryEvents")
        inventory_events.create_index("productId")
        inventory_events.create_index("createdAt")

        logger.info("Database indexes initialized successfully.")

# Global database instance
db_instance = Database()

def get_db():
    global db_instance
    if db_instance is None:
        db_instance = Database()
    return db_instance
