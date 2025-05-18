db.auth('root', 'Admin123!');

db = db.getSiblingDB('nexon');

// Create collections
db.createCollection('users');
db.createCollection('events');
db.createCollection('rewards');
