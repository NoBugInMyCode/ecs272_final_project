"""
steam_analysis.py
This script loads the provided Steam Games dataset (steam_project_sample.csv),
performs a variety of exploratory analyses, computes additional metrics, and
generates several figures that will be used in a data storytelling
presentation. Each function in this module produces a specific visualization.

Usage:
    python steam_analysis.py

The generated figures are saved into an `images` directory relative to the
script location. If the directory does not exist, it will be created.

Dependencies:
    - pandas
    - numpy
    - matplotlib
    - seaborn

Each plot uses a dark-on-light theme appropriate for presentation slides. The
color palettes are intentionally simple to avoid the seaborn palette error
encountered during earlier attempts. For categories that may be missing
values (e.g. certain price bands in a given year), pivot tables are
constructed with `fill_value=0` to guarantee columns exist, avoiding
KeyError exceptions.
"""

import os

# Disable jupyter-tools logging to avoid connection errors in the CAAS environment
try:
    import caas_jupyter_tools  # type: ignore
    caas_jupyter_tools.is_jupyter_server_enabled = False
except Exception:
    # If the module isn't available or fails to import, silently ignore.
    pass
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns


def load_and_prepare_data(csv_path: str) -> pd.DataFrame:
    """Load the CSV file and compute additional metrics.

    Parameters
    ----------
    csv_path: str
        Path to the steam games sample CSV file.

    Returns
    -------
    pd.DataFrame
        DataFrame with additional columns for positive reviews and value index.
    """
    df = pd.read_csv(csv_path)
    # Compute positive review count from review_total and pos_ratio (assumed 0-1 scale)
    df['positive_reviews'] = (df['review_total'] * df['pos_ratio']).fillna(0)
    # Define value index as peak concurrent users per dollar to capture popularity relative to price.
    # If price is zero (free games), leave value_index as NaN since the ratio is undefined.
    df['value_index'] = df.apply(
        lambda row: row['peak_ccu'] / row['price'] if row['price'] > 0 else np.nan,
        axis=1
    )
    # Simplify primary_genre: ensure string and strip whitespace
    df['primary_genre'] = df['primary_genre'].fillna('Unknown').astype(str).str.strip()
    return df


def plot_price_vs_popularity(
    df: pd.DataFrame,
    output_dir: str,
    top_n_labels: int = 8,
    add_trend: bool = True
):
    """
    Clean final version of the scatter plot:
    x = price (log scale)
    y = peak_ccu (log scale)

    Improvements over the previous version:
    - no redundant price-band color encoding
    - no bubble-size encoding for pos_ratio
    - lower visual clutter
    - optional median trend line across price bins
    - annotate a few most popular outlier games
    """

    # -------- basic filtering --------
    sub = df.copy()
    sub["price"] = pd.to_numeric(sub["price"], errors="coerce")
    sub["peak_ccu"] = pd.to_numeric(sub["peak_ccu"], errors="coerce")

    sub = sub.dropna(subset=["price", "peak_ccu", "name"]).copy()
    sub = sub[(sub["price"] > 0) & (sub["peak_ccu"] > 0)].copy()

    if len(sub) == 0:
        raise ValueError("No valid rows left after filtering price > 0 and peak_ccu > 0.")

    # -------- figure --------
    plt.figure(figsize=(9, 6))

    # main scatter
    plt.scatter(
        sub["price"],
        sub["peak_ccu"],
        s=18,
        alpha=0.22,
        color="#4C78A8",
        edgecolors="none"
    )

    # -------- optional trend line --------
    if add_trend:
        # use log-spaced price bins, then connect bin medians
        min_price = sub["price"].min()
        max_price = sub["price"].max()

        if min_price > 0 and max_price > min_price:
            bins = np.logspace(np.log10(min_price), np.log10(max_price), 18)
            sub["price_bin"] = pd.cut(sub["price"], bins=bins, include_lowest=True)

            trend = (
                sub.groupby("price_bin", observed=False)
                .agg(
                    price_median=("price", "median"),
                    ccu_median=("peak_ccu", "median"),
                    count=("appid", "count") if "appid" in sub.columns else ("name", "count")
                )
                .reset_index(drop=True)
            )

            # keep only bins with enough points
            trend = trend.dropna(subset=["price_median", "ccu_median"])
            trend = trend[trend["count"] >= 20]

            if len(trend) > 1:
                plt.plot(
                    trend["price_median"],
                    trend["ccu_median"],
                    color="#E45756",
                    linewidth=2.2,
                    label="Median trend by price bin"
                )

    # -------- annotate most popular outliers --------
    label_df = sub.nlargest(top_n_labels, "peak_ccu").copy()

    for _, row in label_df.iterrows():
        plt.annotate(
            row["name"],
            xy=(row["price"], row["peak_ccu"]),
            xytext=(4, 4),
            textcoords="offset points",
            fontsize=8,
            color="#222222",
            alpha=0.9
        )

    # -------- scales and styling --------
    plt.xscale("log")
    plt.yscale("log")

    plt.xlabel("Price (USD, log scale)", fontsize=13)
    plt.ylabel("Peak Concurrent Users (log scale)", fontsize=13)
    plt.title("Game Price vs. Popularity", fontsize=18, pad=12)

    plt.grid(True, which="both", linestyle="--", linewidth=0.5, alpha=0.35)

    if add_trend and "trend" in locals() and len(trend) > 1:
        plt.legend(frameon=False)

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'price_vs_popularity.png'), dpi=300, facecolor="white")
    plt.close()


def plot_peak_ccu_by_price_band(
    df: pd.DataFrame,
    output_dir: str,
    show_points: bool = True
):
    """
    Final replacement for the old 'value index' figure.

    This plot shows the distribution of Peak CCU across price bands.
    It is much easier to interpret than Peak CCU / Price.

    x = price band
    y = peak_ccu (log scale)

    Why this is better:
    - avoids unstable ratio metric
    - includes free games naturally
    - directly compares popularity distribution across price tiers
    - easier to explain in slides
    """

    sub = df.copy()
    sub["price"] = pd.to_numeric(sub["price"], errors="coerce")
    sub["peak_ccu"] = pd.to_numeric(sub["peak_ccu"], errors="coerce")

    sub = sub.dropna(subset=["price", "peak_ccu"]).copy()
    sub = sub[sub["peak_ccu"] > 0].copy()

    if len(sub) == 0:
        raise ValueError("No valid rows left after filtering peak_ccu > 0.")

    # make sure price_band exists
    if "price_band" not in sub.columns:
        def price_band(p):
            if pd.isna(p):
                return "unknown"
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
        sub["price_band"] = sub["price"].apply(price_band)

    band_order = ["free", "(0,5]", "(5,10]", "(10,20]", "(20,40]", "40+"]
    band_order = [b for b in band_order if b in sub["price_band"].unique()]

    plt.figure(figsize=(9, 6))

    # cleaner boxplot, suppress extreme fliers because there are too many
    ax = sns.boxplot(
        data=sub,
        x="price_band",
        y="peak_ccu",
        order=band_order,
        palette=["#B8DE6F", "#8ECAE6", "#73BFE2", "#5E9ED6", "#4C78A8", "#6A4C93"][:len(band_order)],
        showfliers=False,
        width=0.65
    )

    # optional light jittered sample points to show density
    if show_points:
        # sample some rows so it doesn't become too messy
        point_sample = sub.groupby("price_band", group_keys=False).apply(
            lambda x: x.sample(n=min(400, len(x)), random_state=42)
        ).reset_index(drop=True)

        sns.stripplot(
            data=point_sample,
            x="price_band",
            y="peak_ccu",
            order=band_order,
            color="black",
            alpha=0.12,
            size=2.2,
            jitter=0.25
        )

    plt.yscale("log")
    plt.xlabel("Price Band", fontsize=13)
    plt.ylabel("Peak CCU (log scale)", fontsize=13)
    plt.title("Popularity Distribution across Price Bands", fontsize=18, pad=12)

    plt.grid(True, axis="y", which="both", linestyle="--", linewidth=0.5, alpha=0.35)

    # add median labels above each box
    medians = sub.groupby("price_band")["peak_ccu"].median()
    for i, band in enumerate(band_order):
        median_val = medians.get(band, np.nan)
        if pd.notna(median_val) and median_val > 0:
            plt.text(
                i,
                median_val * 1.15,
                f"median={median_val:.1f}",
                ha="center",
                va="bottom",
                fontsize=9,
                color="#333333"
            )

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'peak_ccu_by_price_band.png'), dpi=300, facecolor="white")
    plt.close()


def plot_genre_value_bars(df: pd.DataFrame, output_dir: str, top_n: int = 10):
    """Plot a bar chart of average value index by primary genre.

    Only the top N genres by count are displayed. Genres labelled as
    'Unknown' are excluded to focus on meaningful categories. Error bars
    represent the standard error of the mean.

    Parameters
    ----------
    df: pd.DataFrame
        Prepared DataFrame containing steam game information.
    output_dir: str
        Directory where the plot image will be saved.
    top_n: int
        Number of top genres to display based on game count.
    """
    # Remove games with zero price when computing value index to avoid infinities
    valid = df[(df['price'] > 0) & (df['primary_genre'] != 'Unknown')].copy()
    # Determine top genres by frequency
    top_genres = valid['primary_genre'].value_counts().nlargest(top_n).index
    valid = valid[valid['primary_genre'].isin(top_genres)]
    genre_stats = valid.groupby('primary_genre')['value_index'].agg(['mean', 'count', 'std']).reset_index()
    genre_stats['sem'] = genre_stats['std'] / np.sqrt(genre_stats['count'])
    genre_stats = genre_stats.sort_values('mean', ascending=False)
    plt.figure(figsize=(9, 5))
    plt.barh(genre_stats['primary_genre'], genre_stats['mean'], xerr=genre_stats['sem'], color='#88ccee')
    plt.gca().invert_yaxis()  # largest at top
    plt.xlabel('Average Value Index (Peak CCU per $)')
    plt.title(f'Average Value (Peak CCU per $) by Primary Genre (Top {top_n})')
    plt.tight_layout()
    filename = os.path.join(output_dir, 'genre_value_bar.png')
    plt.savefig(filename, dpi=300)
    plt.close()


def plot_price_trend(df: pd.DataFrame, output_dir: str):
    """Plot average game price over years with breakdown by price band.

    This function creates two plots side by side: the left panel shows
    overall average price per year, and the right panel shows the proportion of
    games in each price band per year. Missing price bands for a given year
    are filled with zero proportion to maintain consistent columns across years.

    Parameters
    ----------
    df: pd.DataFrame
        Prepared DataFrame containing steam game information.
    output_dir: str
        Directory where the plot image will be saved.
    """
    # Only consider entries with a valid release_year (exclude nulls or non-numeric values)
    year_df = df.dropna(subset=['release_year'])
    # Convert release_year to numeric if necessary
    year_df['release_year'] = pd.to_numeric(year_df['release_year'], errors='coerce')
    year_df = year_df.dropna(subset=['release_year'])
    # Compute average price per year
    avg_price = year_df.groupby('release_year')['price'].mean().reset_index()
    # Compute distribution of price bands by year
    pivot = (year_df.groupby(['release_year', 'price_band'])
             .size()
             .reset_index(name='count'))
    total_per_year = pivot.groupby('release_year')['count'].transform('sum')
    pivot['proportion'] = pivot['count'] / total_per_year
    # Pivot table to get price bands columns; fill missing values with 0
    pivot_table = pivot.pivot(index='release_year', columns='price_band', values='proportion').fillna(0)
    # Sort price bands and release_years for consistent plotting
    pivot_table = pivot_table.sort_index()
    price_band_order = ['free', '(0,5]', '(5,10]', '(10,20]', '(20,40]', '40+']
    pivot_table = pivot_table.reindex(columns=[b for b in price_band_order if b in pivot_table.columns], fill_value=0)
    # Plot
    fig, axes = plt.subplots(1, 2, figsize=(12, 5), gridspec_kw={'width_ratios': [1, 1]})
    # Left: average price
    axes[0].plot(avg_price['release_year'], avg_price['price'], marker='o', color='#ffaa00')
    axes[0].set_xlabel('Release Year')
    axes[0].set_ylabel('Average Price (USD)')
    axes[0].set_title('Average Game Price by Year')
    axes[0].grid(axis='y', linestyle='--', linewidth=0.5, alpha=0.7)
    # Right: price band distribution (stacked area chart)
    pivot_table.plot(kind='area', stacked=True, ax=axes[1], cmap='Spectral')
    axes[1].set_xlabel('Release Year')
    axes[1].set_ylabel('Proportion of Games')
    axes[1].set_title('Distribution of Price Bands by Year')
    axes[1].legend(title='Price Band', fontsize=8, bbox_to_anchor=(1.05, 1), loc='upper left')
    plt.tight_layout()
    filename = os.path.join(output_dir, 'price_trend_composite.png')
    plt.savefig(filename, dpi=300)
    plt.close()


def plot_spiral(df, output_dir):
    sub = df.dropna(subset=["release_dt", "price", "peak_ccu", "pos_ratio"]).copy()
    sub = sub[sub["price"] >= 0].copy()

    # 用完整日期，而不是只用 release_year
    sub["release_dt"] = pd.to_datetime(sub["release_dt"], errors="coerce")
    sub = sub.dropna(subset=["release_dt"]).copy()

    min_dt = sub["release_dt"].min()
    max_dt = sub["release_dt"].max()
    total_days = (max_dt - min_dt).days + 1

    # 时间映射成多圈 spiral
    t = (sub["release_dt"] - min_dt).dt.days
    theta = 6 * np.pi * t / total_days   # 3圈

    # 半径用 log，避免便宜游戏全挤在中心
    max_price = sub["price"].max()
    radius = np.log1p(sub["price"]) / np.log1p(max_price) * 10

    # 点大小：对 peak_ccu 开平方，避免极端值过大
    size = np.sqrt(sub["peak_ccu"].clip(lower=1)) * 0.4

    fig = plt.figure(figsize=(8, 8))
    ax = fig.add_subplot(111, projection="polar")

    sc = ax.scatter(
        theta,
        radius,
        c=sub["pos_ratio"],
        s=size,
        cmap="viridis",
        alpha=0.65,
        edgecolor="none"
    )

    ax.set_title("Improved Spiral Plot: Time, Price, Popularity, Review Ratio", pad=20)
    cbar = fig.colorbar(sc, ax=ax, pad=0.1)
    cbar.set_label("Positive Review Ratio")

    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'spiral_plot.png'), dpi=300, facecolor="white")
    plt.close()


def main():
    # Determine directories
    base_dir = Path(__file__).resolve().parent
    csv_path = base_dir / 'steam_project_ready.csv'
    images_dir = base_dir / 'images'
    images_dir.mkdir(exist_ok=True)
    # Load and prepare data
    df = load_and_prepare_data(str(csv_path))
    # Generate plots
    plot_price_vs_popularity(df, str(images_dir))
    plot_peak_ccu_by_price_band(df, str(images_dir))
    plot_genre_value_bars(df, str(images_dir), top_n=10)
    plot_price_trend(df, str(images_dir))
    plot_spiral(df, str(images_dir))
    print('Plots generated in', images_dir)


if __name__ == '__main__':
    main()