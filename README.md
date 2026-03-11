# ECS272 Final Project
Shaokang Xie, Jiazhi Sun


# Data Processing (ecs272_final_project)

This folder contains scripts for downloading and processing the Steam games dataset.

## Instructions
0. Install the required python libraries:
```bash
python -m pip install -r data_processing/requirements.txt
```

1. Download the raw dataset (saves to `data_processing/raw/`):

```bash
python data_processing/download_py.py
```

2. Preprocess the raw CSV into cleaned outputs:

```bash
python data_processing/preprocess.py \
  --input data_processing/raw/games.csv \
  --json_reviews data_processing/raw/games.json \
  --out data_processing/steam_project_ready.csv \
  --agg_out /tmp/steam_project_agg.csv \
  --sample_out /tmp/steam_project_sample.csv
```

3. Generate a slimmed JSON for the frontend:

```bash
python data_processing/make_slim_json.py
```


4. Plot the analysis figures
```bash
python data_processing/steam_analysis_slide_figure.py
```


### Output files

- `data_processing/raw/games.csv` and `data_processing/raw/games.json` (raw dataset from kaggle)
- `data_processing/steam_project_ready.csv` (cleaned dataset for slide figures)
- `frontend/public/games_slim.json` (frontend-ready slim JSON)
- `data_processing/images/genre_value_bar.png` (analysis figure used in slides)
- `data_processing/images/peak_ccu_by_price_band.png` (analysis figure used in slides)
- `data_processing/images/price_trend_composite.png` (analysis figure used in slides)
- `data_processing/images/price_vs_popularity.png` (analysis figure used in slides)
- `data_processing/images/spiral_plot.png` (analysis figure used in slides)


## Run the React Frontend

1. `cd frontend`
2. `npm install`
3. `npm start`

