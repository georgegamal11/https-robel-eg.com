import json

with open('public/assets/data/inventory.json', 'r', encoding='utf-8-sig') as f:
    raw = f.read()

# Find where the corruption starts
idx = raw.find(',{" code')
if idx < 0:
    # no corruption marker found, try to find last valid CE006 entry
    ce6 = raw.rfind('"CE006"')
    idx = raw.find('}', ce6) + 1

valid = raw[:idx].strip().rstrip(',')
if not valid.endswith(']'):
    valid += ']'

try:
    existing = json.loads(valid)
    print(f"Parsed {len(existing)} existing units OK")
except Exception as e:
    print(f"Still broken: {e}")
    exit(1)

# Remove any existing SHOPS units (duplicates)
existing = [u for u in existing if u.get('project') != 'SHOPS']
print(f"After removing old SHOPS: {len(existing)}")

shops = [
    {"code": "B10S3B", "project": "SHOPS", "price": 6231000, "floor": "Ground Floor", "view": "No View", "area": 67,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B10S6B", "project": "SHOPS", "price": 6231000, "floor": "Ground Floor", "view": "No View", "area": 67,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S10",  "project": "SHOPS", "price": 2766000, "floor": "Ground Floor", "view": "No View", "area": 33,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S11",  "project": "SHOPS", "price": 4358000, "floor": "Ground Floor", "view": "No View", "area": 52,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S12",  "project": "SHOPS", "price": 4358000, "floor": "Ground Floor", "view": "No View", "area": 52,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S14",  "project": "SHOPS", "price": 3101000, "floor": "Ground Floor", "view": "No View", "area": 37,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S15",  "project": "SHOPS", "price": 4107000, "floor": "Ground Floor", "view": "No View", "area": 49,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S16",  "project": "SHOPS", "price": 5196000, "floor": "Ground Floor", "view": "No View", "area": 62,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S21",  "project": "SHOPS", "price": 3612000, "floor": "Ground Floor", "view": "No View", "area": 42,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S22",  "project": "SHOPS", "price": 3183000, "floor": "Ground Floor", "view": "No View", "area": 37,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S25",  "project": "SHOPS", "price": 4129000, "floor": "Ground Floor", "view": "No View", "area": 48,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S26",  "project": "SHOPS", "price": 3183000, "floor": "Ground Floor", "view": "No View", "area": 37,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S27",  "project": "SHOPS", "price": 5160000, "floor": "Ground Floor", "view": "No View", "area": 60,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S3",   "project": "SHOPS", "price": 4442000, "floor": "Ground Floor", "view": "No View", "area": 53,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S6",   "project": "SHOPS", "price": 3269000, "floor": "Ground Floor", "view": "No View", "area": 39,  "status": "Available", "type": "shop", "intent": "buy"},
    {"code": "B9S7",   "project": "SHOPS", "price": 4358000, "floor": "Ground Floor", "view": "No View", "area": 52,  "status": "Available", "type": "shop", "intent": "buy"},
]

existing.extend(shops)
print(f"Total after adding {len(shops)} shops: {len(existing)}")

with open('public/assets/data/inventory.json', 'w', encoding='utf-8') as f:
    json.dump(existing, f, ensure_ascii=False, indent=4)

print("SUCCESS: inventory.json saved!")
