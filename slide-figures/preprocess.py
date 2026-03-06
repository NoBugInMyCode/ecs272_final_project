import argparse
import csv
import re
import ast
import json
import numpy as np
import pandas as pd

NEEDED_COLS = [
    "AppID", "Name", "Release date", "Estimated owners", "Peak CCU",
    "Price", "Positive", "Negative", "Median playtime forever",
    "Genres", "Tags"
]


def parse_owners_mid(s: str):
    if s is None:
        return np.nan
    nums = re.findall(r"\d[\d,]*", str(s))
    nums = [int(x.replace(",", "")) for x in nums]
    if len(nums) >= 2:
        return (nums[0] + nums[1]) / 2.0
    if len(nums) == 1:
        return float(nums[0])
    return np.nan


def parse_listlike(x):
    if x is None:
        return []
    s = str(x).strip()
    if not s or s in {"[]", "nan", "None"}:
        return []
    if s.startswith("[") and s.endswith("]"):
        try:
            v = ast.literal_eval(s)
            if isinstance(v, list):
                return [str(i).strip() for i in v if str(i).strip()]
        except Exception:
            pass
    return [t.strip() for t in s.split(",") if t.strip()]


def parse_tags_from_json(x):
    if x is None:
        return []

    if isinstance(x, list):
        return [str(i).strip() for i in x if str(i).strip()]

    if isinstance(x, dict):
        return [str(k).strip() for k in x.keys() if str(k).strip()]

    return parse_listlike(x)


def parse_release_date(x):
    if x is None:
        return pd.NaT
    s = str(x).strip()
    if not s:
        return pd.NaT
    low = s.lower()
    if any(k in low for k in ["coming soon", "to be announced", "tba", "announced"]):
        return pd.NaT

    dt = pd.to_datetime(s, format="%b %d, %Y", errors="coerce")
    if pd.isna(dt):
        dt = pd.to_datetime(s, errors="coerce")
    return dt


def year_band(y):
    if pd.isna(y):
        return "unknown"
    y = int(y)
    if y < 2010:
        return "pre-2010"
    if y <= 2014:
        return "2010-2014"
    if y <= 2019:
        return "2015-2019"
    if y <= 2021:
        return "2020-2021"
    if y <= 2023:
        return "2022-2023"
    return "2024+"


def price_band(p):
    if pd.isna(p):
        return "unknown"
    p = float(p)
    if p <= 0:
        return "free"
    if p <= 5:
        return "(0,5]"
    if p <= 10:
        return "(5,10]"
    if p <= 20:
        return "(10,20]"
    if p <= 40:
        return "(20,40]"
    return "40+"


def to_float(x):
    try:
        if x is None:
            return np.nan
        s = str(x).strip()
        if s == "":
            return np.nan
        return float(s)
    except Exception:
        return np.nan


def to_int(x):
    try:
        if x is None:
            return 0
        s = str(x).strip()
        if s == "":
            return 0
        return int(float(s))
    except Exception:
        return 0


def load_json_review_map(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    review_map = {}
    bad_keys = 0

    for appid_str, info in raw.items():
        try:
            appid = int(appid_str)
        except Exception:
            bad_keys += 1
            continue

        positive = to_int(info.get("positive"))
        negative = to_int(info.get("negative"))

        genres_list = []
        if "genres" in info:
            if isinstance(info["genres"], list):
                genres_list = [str(g).strip() for g in info["genres"] if str(g).strip()]
            else:
                genres_list = parse_listlike(info["genres"])

        tags_list = []
        if "tags" in info:
            tags_list = parse_tags_from_json(info["tags"])

        review_map[appid] = {
            "positive": positive,
            "negative": negative,
            "genres_list": genres_list,
            "tags_list": tags_list,
        }

    print(f"Loaded JSON review map: {len(review_map)} appids")
    if bad_keys > 0:
        print(f"Skipped non-numeric JSON keys: {bad_keys}")

    return review_map


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--out", default="steam_project_ready.csv")
    ap.add_argument("--agg_out", default="steam_project_agg.csv")
    ap.add_argument("--sample_out", default="steam_project_sample.csv")
    ap.add_argument("--sample_n", type=int, default=30000)
    ap.add_argument("--min_reviews_for_ratio", type=int, default=20)
    ap.add_argument(
        "--json_reviews",
        default=None,
        help="Optional JSON file with correct positive/negative (and optionally genres/tags)"
    )
    args = ap.parse_args()

    rows = []
    total = 0
    kept = 0
    bad_appid = 0
    missing_cols = 0

    with open(args.input, "r", encoding="utf-8-sig", errors="replace", newline="") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or []

        for c in NEEDED_COLS:
            if c not in header:
                missing_cols += 1

        if missing_cols > 0:
            print("ERROR: CSV header doesn't contain expected columns.")
            print("Found columns:", header[:30], "...")
            return

        for r in reader:
            total += 1

            appid = (r.get("AppID") or "").strip()
            if not appid.isdigit():
                bad_appid += 1
                continue

            row = {
                "appid": int(appid),
                "name": (r.get("Name") or "").strip(),
                "release_dt": parse_release_date(r.get("Release date")),
                "owners_mid": parse_owners_mid(r.get("Estimated owners")),
                "peak_ccu": to_int(r.get("Peak CCU")),
                "price": to_float(r.get("Price")),
                "positive": to_int(r.get("Positive")),
                "negative": to_int(r.get("Negative")),
                "median_playtime_forever": to_float(r.get("Median playtime forever")),
                "genres_raw": r.get("Genres"),
                "tags_raw": r.get("Tags"),
            }
            rows.append(row)
            kept += 1

    df = pd.DataFrame(rows)

    print(f"Read lines: {total}")
    print(f"Kept rows (valid numeric appid): {kept}")
    print(f"Dropped rows (bad appid / misaligned): {bad_appid}")

    # -------- parse original csv genres/tags first --------
    df["genres_list"] = df["genres_raw"].apply(parse_listlike)
    df["tags_list"] = df["tags_raw"].apply(parse_listlike)

    # -------- optionally override positive/negative (and optionally genres/tags) from JSON --------
    if args.json_reviews is not None:
        review_map = load_json_review_map(args.json_reviews)

        matched = 0
        review_updated = 0
        genre_updated = 0
        tags_updated = 0

        for i, row in df.iterrows():
            aid = row["appid"]
            info = review_map.get(aid)
            if info is None:
                continue

            matched += 1

            # overwrite review counts from JSON
            df.at[i, "positive"] = info["positive"]
            df.at[i, "negative"] = info["negative"]
            review_updated += 1

            # if JSON has better genre info, replace when available
            if info["genres_list"]:
                df.at[i, "genres_list"] = info["genres_list"]
                genre_updated += 1

            # if JSON has better tags info, replace when available
            if info["tags_list"]:
                df.at[i, "tags_list"] = info["tags_list"]
                tags_updated += 1

        print(f"Matched rows with JSON appids: {matched}")
        print(f"Updated review counts from JSON: {review_updated}")
        print(f"Updated genres from JSON: {genre_updated}")
        print(f"Updated tags from JSON: {tags_updated}")

    # -------- derived fields --------
    df["release_year"] = df["release_dt"].dt.year
    df = df[(df["release_year"].isna()) | (df["release_year"] != 2026)].copy()
    df["year_band"] = df["release_year"].apply(year_band)
    df["price_band"] = df["price"].apply(price_band)

    df["review_total"] = df["positive"].fillna(0) + df["negative"].fillna(0)
    df["pos_ratio"] = np.where(
        df["review_total"] > 0,
        df["positive"] / df["review_total"],
        np.nan
    )
    df.loc[df["review_total"] < args.min_reviews_for_ratio, "pos_ratio"] = np.nan

    df["median_playtime_hours"] = df["median_playtime_forever"] / 60.0

    df["primary_genre"] = df["genres_list"].apply(lambda xs: xs[0] if xs else "Unknown")
    df["tags"] = df["tags_list"].apply(lambda xs: ", ".join(xs[:8]))

    # -------- project-friendly filters --------
    df = df[df["price"].notna() & df["owners_mid"].notna()].copy()
    df = df[df["owners_mid"] > 0].copy()

    drop_words = r"(?:\bplaytest\b|\bdemo\b|\btest server\b|\bsoundtrack\b|\bdedicated server\b)"
    df = df[
        ~df["name"].astype(str).str.lower().str.contains(drop_words, regex=True, na=False)
    ].copy()

    out = df[[
        "appid", "name",
        "release_dt", "release_year", "year_band",
        "price", "price_band",
        "owners_mid", "peak_ccu",
        "median_playtime_hours",
        "review_total", "pos_ratio",
        "primary_genre", "tags"
    ]].copy()

    out.to_csv(args.out, index=False)
    print("Saved:", args.out, "rows=", len(out))

    agg = (
        out.groupby(["year_band", "price_band", "primary_genre"], dropna=False)
        .agg(
            game_count=("appid", "count"),
            owners_mid_median=("owners_mid", "median"),
            peak_ccu_median=("peak_ccu", "median"),
            playtime_median=("median_playtime_hours", "median"),
            pos_ratio_median=("pos_ratio", "median"),
            reviews_median=("review_total", "median"),
        )
        .reset_index()
    )
    agg.to_csv(args.agg_out, index=False)
    print("Saved:", args.agg_out, "rows=", len(agg))

    sample = out.sample(n=min(args.sample_n, len(out)), random_state=42)
    sample.to_csv(args.sample_out, index=False)
    print("Saved:", args.sample_out, "rows=", len(sample))

    print("\nSanity check (first 5 rows):")
    print(out.head(5)[["appid", "name", "price", "owners_mid", "release_year", "primary_genre", "review_total", "pos_ratio"]])


if __name__ == "__main__":
    main()
