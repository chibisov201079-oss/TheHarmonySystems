#!/usr/bin/env python3
"""
THS Market Pulse — расчёт композитного индекса рыночного направления.

Индикаторы (5 независимых измерений, без дублирования сигнала):
  MACD  — направление тренда
  ADX   — сила тренда (через +DI/-DI)
  RSI   — моментум
  MFI   — подтверждение объёмом
  BB %B — волатильность / позиция цены в канале

Источники данных:
  BTC, ETH        -> Binance public API (бесплатно, без ключа)
  Gold (XAU/USD)  -> Alpha Vantage (бесплатный ключ, ~25 запросов/день)
  EUR/USD         -> Alpha Vantage

Результат пишется в data/market-pulse.json.

Частота запуска (см. workflow): каждые 30 минут.
Внутри скрипта: крипта пересчитывается каждый запуск, форекс/золото —
только если с прошлого обновления прошло >= 4 часов (бережём лимит
бесплатного тарифа Alpha Vantage: 25 запросов/день).
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests
from ta.trend import MACD, ADXIndicator
from ta.momentum import RSIIndicator
from ta.volume import MFIIndicator
from ta.volatility import BollingerBands

DATA_PATH = "data/market-pulse.json"
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")
FOREX_REFRESH_HOURS = 4
UPDATE_CYCLE_MINUTES = 30

WEIGHTS = {"macd": 0.2, "adx": 0.2, "rsi": 0.2, "mfi": 0.2, "bb": 0.2}
SIGNAL_SCORE = {"buy": 100, "neutral": 50, "sell": 0}


# ───────────────────────── DATA FETCHING ─────────────────────────

def fetch_binance_klines(symbol: str, interval: str = "1d", limit: int = 60) -> pd.DataFrame:
    """Fetch OHLCV candles from Binance public API (no key needed)."""
    url = "https://api.binance.com/api/v3/klines"
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    raw = r.json()
    df = pd.DataFrame(raw, columns=[
        "open_time", "open", "high", "low", "close", "volume",
        "close_time", "quote_vol", "trades", "taker_base", "taker_quote", "ignore"
    ])
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = df[col].astype(float)
    df["date"] = pd.to_datetime(df["open_time"], unit="ms")
    return df[["date", "open", "high", "low", "close", "volume"]]


def fetch_binance_24hr_ticker(symbol: str) -> dict:
    url = "https://api.binance.com/api/v3/ticker/24hr"
    r = requests.get(url, params={"symbol": symbol}, timeout=20)
    r.raise_for_status()
    return r.json()


def fetch_alpha_vantage_fx_daily(from_symbol: str, to_symbol: str) -> pd.DataFrame:
    """Fetch daily FX candles from Alpha Vantage (FX_DAILY endpoint)."""
    url = "https://www.alphavantage.co/query"
    params = {
        "function": "FX_DAILY",
        "from_symbol": from_symbol,
        "to_symbol": to_symbol,
        "outputsize": "compact",
        "apikey": ALPHA_VANTAGE_KEY,
    }
    r = requests.get(url, params=params, timeout=30)
    r.raise_for_status()
    js = r.json()
    series = js.get("Time Series FX (Daily)")
    if not series:
        raise RuntimeError(f"Alpha Vantage error for {from_symbol}/{to_symbol}: {js}")
    rows = []
    for date_str, vals in series.items():
        rows.append({
            "date": pd.to_datetime(date_str),
            "open": float(vals["1. open"]),
            "high": float(vals["2. high"]),
            "low": float(vals["3. low"]),
            "close": float(vals["4. close"]),
        })
    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    # FX has no volume; synthesize a flat volume series so MFI still runs
    # (MFI degrades gracefully to a variant of RSI when volume is constant).
    df["volume"] = 1.0
    return df


def fetch_fear_greed() -> dict:
    """Crypto Fear & Greed Index — free public API, no key needed."""
    try:
        r = requests.get("https://api.alternative.me/fng/?limit=1", timeout=15)
        r.raise_for_status()
        js = r.json()["data"][0]
        return {"value": int(js["value"]), "label": js["value_classification"]}
    except Exception as e:
        print(f"[warn] Fear & Greed fetch failed: {e}", file=sys.stderr)
        return None


# ───────────────────────── INDICATOR LOGIC ─────────────────────────

def compute_signals(df: pd.DataFrame) -> pd.DataFrame:
    """Given a daily OHLCV dataframe, compute buy/sell/neutral signal for
    each of the 5 indicators, plus a 0-100 composite score, for every row
    (so we can derive both the current signal and the 14-day history)."""
    df = df.copy()

    macd = MACD(df["close"], window_slow=26, window_fast=12, window_sign=9)
    df["macd_diff"] = macd.macd_diff()

    adx_ind = ADXIndicator(df["high"], df["low"], df["close"], window=14)
    df["adx"] = adx_ind.adx()
    df["di_plus"] = adx_ind.adx_pos()
    df["di_minus"] = adx_ind.adx_neg()

    df["rsi"] = RSIIndicator(df["close"], window=14).rsi()

    mfi_ind = MFIIndicator(df["high"], df["low"], df["close"], df["volume"], window=14)
    df["mfi"] = mfi_ind.money_flow_index()

    bb = BollingerBands(df["close"], window=20, window_dev=2)
    df["bb_pct"] = bb.bollinger_pband()  # %B: 0 = lower band, 1 = upper band

    def macd_signal(row):
        if pd.isna(row["macd_diff"]):
            return "neutral"
        eps = abs(row["close"]) * 0.0003
        if row["macd_diff"] > eps:
            return "buy"
        if row["macd_diff"] < -eps:
            return "sell"
        return "neutral"

    def adx_signal(row):
        if pd.isna(row["adx"]):
            return "neutral"
        if row["adx"] < 20:
            return "neutral"  # weak/no trend
        return "buy" if row["di_plus"] > row["di_minus"] else "sell"

    def rsi_signal(row):
        if pd.isna(row["rsi"]):
            return "neutral"
        if row["rsi"] > 55:
            return "buy"
        if row["rsi"] < 45:
            return "sell"
        return "neutral"

    def mfi_signal(row):
        if pd.isna(row["mfi"]):
            return "neutral"
        if row["mfi"] > 55:
            return "buy"
        if row["mfi"] < 45:
            return "sell"
        return "neutral"

    def bb_signal(row):
        if pd.isna(row["bb_pct"]):
            return "neutral"
        if row["bb_pct"] > 0.6:
            return "buy"
        if row["bb_pct"] < 0.4:
            return "sell"
        return "neutral"

    df["sig_macd"] = df.apply(macd_signal, axis=1)
    df["sig_adx"] = df.apply(adx_signal, axis=1)
    df["sig_rsi"] = df.apply(rsi_signal, axis=1)
    df["sig_mfi"] = df.apply(mfi_signal, axis=1)
    df["sig_bb"] = df.apply(bb_signal, axis=1)

    df["score"] = (
        df["sig_macd"].map(SIGNAL_SCORE) * WEIGHTS["macd"]
        + df["sig_adx"].map(SIGNAL_SCORE) * WEIGHTS["adx"]
        + df["sig_rsi"].map(SIGNAL_SCORE) * WEIGHTS["rsi"]
        + df["sig_mfi"].map(SIGNAL_SCORE) * WEIGHTS["mfi"]
        + df["sig_bb"].map(SIGNAL_SCORE) * WEIGHTS["bb"]
    ).round().astype("Int64")

    return df


def status_from_score(score: int) -> str:
    if score >= 65:
        return "long"
    if score <= 35:
        return "short"
    return "flat"


def build_asset_payload(df: pd.DataFrame, live_high=None, live_low=None,
                          binance_symbol: str = None) -> dict:
    """Build the JSON payload for one asset from a computed dataframe."""
    df = df.dropna(subset=["score"]).reset_index(drop=True)
    if df.empty:
        raise RuntimeError("No valid rows after indicator warm-up period")

    last = df.iloc[-1]
    prev_day = df.iloc[-2] if len(df) >= 2 else last

    history_14d = df["score"].tail(14).astype(int).tolist()
    while len(history_14d) < 14:
        history_14d.insert(0, history_14d[0] if history_14d else 50)

    payload = {
        "score": int(last["score"]),
        "status": status_from_score(int(last["score"])),
        "indicators": {
            "macd": last["sig_macd"],
            "adx": last["sig_adx"],
            "rsi": last["sig_rsi"],
            "mfi": last["sig_mfi"],
            "bb": last["sig_bb"],
        },
        "history_14d": history_14d,
        "price_context": {
            "prev_day_high": round(float(prev_day["high"]), 5),
            "prev_day_low": round(float(prev_day["low"]), 5),
            "session_high": round(float(live_high if live_high is not None else last["high"]), 5),
            "session_low": round(float(live_low if live_low is not None else last["low"]), 5),
        },
    }
    if binance_symbol:
        payload["symbol"] = binance_symbol
    return payload


# ───────────────────────── MAIN ─────────────────────────

def load_existing_data() -> dict:
    if os.path.exists(DATA_PATH):
        try:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def should_refresh_forex(existing: dict) -> bool:
    ts = existing.get("forex_updated_at")
    if not ts:
        return True
    try:
        last = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return True
    return (datetime.now(timezone.utc) - last) >= timedelta(hours=FOREX_REFRESH_HOURS)


def main():
    existing = load_existing_data()
    now = datetime.now(timezone.utc)
    assets = existing.get("assets", {})

    # ── Crypto: always refreshed ──
    for name, symbol in [("BTC", "BTCUSDT"), ("ETH", "ETHUSDT")]:
        print(f"[info] Fetching {name} ({symbol}) from Binance...")
        df = fetch_binance_klines(symbol, interval="1d", limit=60)
        df = compute_signals(df)
        ticker = fetch_binance_24hr_ticker(symbol)
        assets[name] = build_asset_payload(
            df,
            live_high=float(ticker["highPrice"]),
            live_low=float(ticker["lowPrice"]),
            binance_symbol=symbol,
        )
        print(f"[info] {name} score={assets[name]['score']} status={assets[name]['status']}")

    # ── Forex/Gold: refreshed at most every FOREX_REFRESH_HOURS ──
    forex_updated_at = existing.get("forex_updated_at")
    if should_refresh_forex(existing) and ALPHA_VANTAGE_KEY:
        try:
            print("[info] Fetching XAU/USD from Alpha Vantage...")
            df_xau = fetch_alpha_vantage_fx_daily("XAU", "USD")
            df_xau = compute_signals(df_xau)
            assets["XAU"] = build_asset_payload(df_xau)

            print("[info] Fetching EUR/USD from Alpha Vantage...")
            df_eur = fetch_alpha_vantage_fx_daily("EUR", "USD")
            df_eur = compute_signals(df_eur)
            assets["EURUSD"] = build_asset_payload(df_eur)

            forex_updated_at = now.isoformat().replace("+00:00", "Z")
            print("[info] Forex/Gold refreshed.")
        except Exception as e:
            print(f"[warn] Forex/Gold fetch failed, keeping previous data: {e}", file=sys.stderr)
    else:
        reason = "no ALPHA_VANTAGE_KEY set" if not ALPHA_VANTAGE_KEY else "within 4h refresh window"
        print(f"[info] Skipping forex/gold refresh ({reason}).")

    fear_greed = fetch_fear_greed() or existing.get("fear_greed")

    next_update = now + timedelta(minutes=UPDATE_CYCLE_MINUTES)
    output = {
        "updated_at": now.isoformat().replace("+00:00", "Z"),
        "next_update_at": next_update.isoformat().replace("+00:00", "Z"),
        "forex_updated_at": forex_updated_at,
        "assets": assets,
        "fear_greed": fear_greed,
    }

    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[info] Wrote {DATA_PATH}")


if __name__ == "__main__":
    main()
