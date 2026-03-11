import argparse
from pathlib import Path

import kagglehub


def main() -> None:
    ap = argparse.ArgumentParser(description="Download the Steam Games dataset via kagglehub.")
    ap.add_argument(
        "--output-dir",
        default=None,
        help="Directory where the downloaded files will be saved (default: data_processing/raw)",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if files already exist in the output directory.",
    )

    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    default_out = repo_root / "data_processing" / "raw"
    out_dir = Path(args.output_dir) if args.output_dir else default_out
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"Downloading dataset into: {out_dir}")
    path = kagglehub.dataset_download(
        "fronkongames/steam-games-dataset",
        output_dir=str(out_dir),
        force_download=args.force,
    )

    print("Download complete.")
    print("Path to dataset files:", path)
    print("Expected files: games.csv, games.json")


if __name__ == "__main__":
    main()
