import json

INPUT_FILE = "games.json"
OUTPUT_FILE = "../frontend/public"

KEEP_FIELDS = [
    "name",
    "release_date",
    "required_age",
    "price",
    "dlc_count",
    "windows",
    "mac",
    "linux",
    "metacritic_score",
    "user_score",
    "achievements",
    "recommendations",
    "developers",
    "publishers",
    "categories",
    "genres",
    "positive",
    "negative",
    "estimated_owners",
    "average_playtime_forever",
    "average_playtime_2weeks",
    "median_playtime_forever",
    "median_playtime_2weeks",
    "peak_ccu",
    "tags",
]

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

if not isinstance(data, dict):
    raise ValueError("Expected top-level JSON object mapping appid -> game object")

slim_data = []

for appid, row in data.items():
    if not isinstance(row, dict):
        continue

    slim_row = {
        "appid": appid
    }

    for key in KEEP_FIELDS:
        slim_row[key] = row.get(key, None)

    slim_data.append(slim_row)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(slim_data, f, ensure_ascii=False)

print(f"Done: wrote {len(slim_data)} rows to {OUTPUT_FILE}")
if slim_data:
    print("Sample row:")
    print(json.dumps(slim_data[0], ensure_ascii=False, indent=2))