import argparse
import json
from pathlib import Path

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


def main() -> None:
    ap = argparse.ArgumentParser(description="Create a slimmed-down games JSON for the frontend.")
    ap.add_argument(
        "--input",
        default=None,
        help="Path to the raw games.json file (default: data_processing/raw/games.json)",
    )
    ap.add_argument(
        "--output",
        default=None,
        help="Destination path for the slimmed JSON file (default: frontend/public/games_slim.json)",
    )
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    default_input = repo_root / "data_processing" / "raw" / "games.json"
    default_output = repo_root / "frontend" / "public" / "games_slim.json"

    input_path = Path(args.input) if args.input else default_input
    output_path = Path(args.output) if args.output else default_output

    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, dict):
        raise ValueError("Expected top-level JSON object mapping appid -> game object")

    slim_data = []

    for appid, row in data.items():
        if not isinstance(row, dict):
            continue

        slim_row = {"appid": appid}

        for key in KEEP_FIELDS:
            slim_row[key] = row.get(key, None)

        slim_data.append(slim_row)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(slim_data, f, ensure_ascii=False)

    print(f"Done: wrote {len(slim_data)} rows to {output_path}")
    if slim_data:
        print("Sample row:")
        print(json.dumps(slim_data[0], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
