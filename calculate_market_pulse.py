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
  Fear & Greed    -> Alternative.me (бесплатно, без ключа)
  Market Analytics-> CoinGecko free tier (бесплатно, без ключа,
                     обновляется не чаще раза в час — см. ANALYTICS_REFRESH_MINUTES)
  Capital Flows   -> DefiLlama (бесплатно, без ключа: TVL по сетям/протоколам,
                     объём DEX, капа стейблов — обновляется не чаще раза в час,
                     см. CAPITAL_FLOWS_REFRESH_MINUTES)

Результат пишется в data/market-pulse.json.

Частота запуска (см. workflow): каждые 30 минут.
Внутри скрипта: крипта пересчитывается каждый запуск, форекс/золото —
только если с прошлого обновления прошло >= 4 часов (бережём лимит
бесплатного тарифа Alpha Vantage: 25 запросов/день), market analytics —
не чаще раза в час (бережём лимит бесплатного тарифа CoinGecko).
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
ANALYTICS_REFRESH_MINUTES = 60
CAPITAL_FLOWS_REFRESH_MINUTES = 60
UPDATE_CYCLE_MINUTES = 30

# ── Потоки капитала: активы по риск-уровням ──
# ETH/SOL считаем по сети (chain TVL), Ethena — это протокол, не сеть,
# поэтому у него отдельный endpoint (/protocol/{slug} вместо /v2/historicalChainTvl).
CAPITAL_FLOW_CHAINS = {
    "ETH": "ethereum",
    "SOL": "solana",
    "HYPE": "hyperliquid-l1",
    "TON": "ton",
    "MNT": "mantle",
    "TAO": "bittensor",
}
CAPITAL_FLOW_PROTOCOLS = {
    "ENA": "ethena",
}
CAPITAL_FLOW_RISK_TIERS = {
    "low": ["ETH", "SOL"],
    "medium": ["HYPE", "TON", "MNT"],
    "high": ["TAO", "ENA"],
}

WEIGHTS = {"macd": 0.2, "adx": 0.2, "rsi": 0.2, "mfi": 0.2, "bb": 0.2}
SIGNAL_SCORE = {"buy": 100, "neutral": 50, "sell": 0}


# ───────────────────────── DATA FETCHING ─────────────────────────

def fetch_binance_klines(symbol: str, interval: str = "1d", limit: int = 60) -> pd.DataFrame:
    """Fetch OHLCV candles from Binance's public data mirror.
    Uses data-api.binance.vision instead of api.binance.com — the regular
    domain returns HTTP 451 (geo-block) from US-hosted CI runners like
    GitHub Actions; this mirror serves the same public market data without
    that restriction."""
    url = "https://data-api.binance.vision/api/v3/klines"
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
    url = "https://data-api.binance.vision/api/v3/ticker/24hr"
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


def fetch_coingecko_global() -> dict:
    """Global crypto market snapshot — CoinGecko free tier, no key needed.
    Gives total market cap / volume and dominance of top coins."""
    r = requests.get("https://api.coingecko.com/api/v3/global", timeout=20)
    r.raise_for_status()
    d = r.json()["data"]
    mcap_pct = d.get("market_cap_percentage", {})
    return {
        "total_market_cap_usd": float(d["total_market_cap"]["usd"]),
        "market_cap_change_24h_pct": round(float(d["market_cap_change_percentage_24h_usd"]), 2),
        "total_volume_24h_usd": float(d["total_volume"]["usd"]),
        "btc_dominance_pct": round(float(mcap_pct.get("btc", 0)), 2),
        "eth_dominance_pct": round(float(mcap_pct.get("eth", 0)), 2),
    }


def fetch_coingecko_top_volumes() -> list:
    """24h trading volume for BTC/ETH/SOL — used to show relative share of
    volume between the three largest assets (not vs. the whole market)."""
    url = "https://api.coingecko.com/api/v3/simple/price"
    params = {
        "ids": "bitcoin,ethereum,solana",
        "vs_currencies": "usd",
        "include_24hr_vol": "true",
    }
    r = requests.get(url, params=params, timeout=20)
    r.raise_for_status()
    js = r.json()
    rows = [
        ("BTC", float(js.get("bitcoin", {}).get("usd_24h_vol", 0))),
        ("ETH", float(js.get("ethereum", {}).get("usd_24h_vol", 0))),
        ("SOL", float(js.get("solana", {}).get("usd_24h_vol", 0))),
    ]
    total = sum(v for _, v in rows) or 1.0
    return [
        {"symbol": sym, "volume_24h_usd": vol, "share_pct": round(vol / total * 100, 1)}
        for sym, vol in rows
    ]


def fetch_market_analytics() -> dict:
    """Combine global snapshot + top-3 volume split into one payload.
    Any failure here must not break the rest of the run — Market Pulse's
    core signals are independent of this block."""
    global_data = fetch_coingecko_global()
    volumes = fetch_coingecko_top_volumes()
    return {**global_data, "top_volume_distribution": volumes}


def fetch_defillama_chain_tvl_series(chain_slug: str) -> list:
    """Историческая серия TVL сети — DefiLlama, бесплатно, без ключа.
    Возвращает список {"date": unix_ts, "tvl": float}, отсортированный по дате."""
    r = requests.get(f"https://api.llama.fi/v2/historicalChainTvl/{chain_slug}", timeout=20)
    r.raise_for_status()
    return r.json()


def fetch_defillama_protocol_tvl_series(protocol_slug: str) -> list:
    """То же самое, но для отдельного протокола (не сети) — например Ethena.
    Формат ответа другой: {"tvl": [{"date":..., "totalLiquidityUSD":...}, ...]}."""
    r = requests.get(f"https://api.llama.fi/protocol/{protocol_slug}", timeout=20)
    r.raise_for_status()
    js = r.json()
    return [
        {"date": p["date"], "tvl": p["totalLiquidityUSD"]}
        for p in js.get("tvl", [])
        if p.get("totalLiquidityUSD") is not None
    ]


def _pct_change_from_series(series: list, days_ago: int):
    """% изменения TVL между последней точкой и ближайшей к (последняя дата - days_ago)."""
    if not series:
        return None
    latest = series[-1]
    target_ts = latest["date"] - days_ago * 86400
    closest = min(series, key=lambda p: abs(p["date"] - target_ts))
    if not closest["tvl"]:
        return None
    return round((latest["tvl"] - closest["tvl"]) / closest["tvl"] * 100, 2)


def fetch_capital_flow_asset(symbol: str) -> dict:
    """TVL + изменение 7д/30д для одного актива риск-карты (сеть или протокол)."""
    if symbol in CAPITAL_FLOW_CHAINS:
        series = fetch_defillama_chain_tvl_series(CAPITAL_FLOW_CHAINS[symbol])
    elif symbol in CAPITAL_FLOW_PROTOCOLS:
        series = fetch_defillama_protocol_tvl_series(CAPITAL_FLOW_PROTOCOLS[symbol])
    else:
        raise ValueError(f"Unknown capital-flow symbol: {symbol}")
    if not series:
        return None
    return {
        "symbol": symbol,
        "tvl_usd": float(series[-1]["tvl"]),
        "change_7d_pct": _pct_change_from_series(series, 7),
        "change_30d_pct": _pct_change_from_series(series, 30),
    }


def fetch_dex_volume_24h() -> float:
    """Суммарный 24ч объём DEX по всему рынку."""
    r = requests.get(
        "https://api.llama.fi/overview/dexs",
        params={"excludeTotalDataChart": "true", "excludeTotalDataChartBreakdown": "true"},
        timeout=20,
    )
    r.raise_for_status()
    return float(r.json().get("total24h", 0))


def fetch_stablecoin_mcap() -> float:
    """Суммарная капитализация всех стейблкоинов (последняя точка ряда)."""
    r = requests.get("https://stablecoins.llama.fi/stablecoincharts/all", timeout=20)
    r.raise_for_status()
    data = r.json()
    if not data:
        return None
    return float(data[-1]["totalCirculatingUSD"]["peggedUSD"])


def fetch_capital_flows() -> dict:
    """Собирает весь блок 'Потоки капитала': TVL по риск-тирам + DEX-объём +
    капа стейблов. Ошибка на ОДНОМ активе не должна ронять остальные —
    каждый актив и каждая доп.метрика оборачиваются в свой try/except."""
    tiers = {}
    for tier, symbols in CAPITAL_FLOW_RISK_TIERS.items():
        rows = []
        for sym in symbols:
            try:
                row = fetch_capital_flow_asset(sym)
                if row:
                    rows.append(row)
            except Exception as e:
                print(f"[warn] capital flow fetch failed for {sym}: {e}", file=sys.stderr)
        tiers[tier] = rows

    dex_vol = None
    try:
        dex_vol = fetch_dex_volume_24h()
    except Exception as e:
        print(f"[warn] DEX volume fetch failed: {e}", file=sys.stderr)

    stable_mcap = None
    try:
        stable_mcap = fetch_stablecoin_mcap()
    except Exception as e:
        print(f"[warn] Stablecoin mcap fetch failed: {e}", file=sys.stderr)

    return {
        "risk_tiers": tiers,
        "dex_volume_24h_usd": dex_vol,
        "stablecoin_mcap_usd": stable_mcap,
    }


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


def should_refresh_analytics(existing: dict) -> bool:
    """Market analytics (CoinGecko) refresh at most once an hour — keeps us
    well inside the free-tier rate limit and matches the brief's cadence."""
    analytics = existing.get("market_analytics") or {}
    ts = analytics.get("updated_at")
    if not ts:
        return True
    try:
        last = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return True
    return (datetime.now(timezone.utc) - last) >= timedelta(minutes=ANALYTICS_REFRESH_MINUTES)


def should_refresh_capital_flows(existing: dict) -> bool:
    """Потоки капитала (DefiLlama) — тоже не чаще раза в час: 9 запросов за
    прогон (6 сетей + Ethena + DEX volume + stablecoins), бережём лимиты."""
    cf = existing.get("capital_flows") or {}
    ts = cf.get("updated_at")
    if not ts:
        return True
    try:
        last = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    except Exception:
        return True
    return (datetime.now(timezone.utc) - last) >= timedelta(minutes=CAPITAL_FLOWS_REFRESH_MINUTES)


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

    # ── Market analytics (CoinGecko): refreshed at most once an hour ──
    market_analytics = existing.get("market_analytics")
    if should_refresh_analytics(existing):
        try:
            print("[info] Fetching global market analytics from CoinGecko...")
            analytics_payload = fetch_market_analytics()
            analytics_payload["updated_at"] = now.isoformat().replace("+00:00", "Z")
            market_analytics = analytics_payload
            print(f"[info] Market analytics refreshed: "
                  f"BTC dom={market_analytics['btc_dominance_pct']}% "
                  f"ETH dom={market_analytics['eth_dominance_pct']}%")
        except Exception as e:
            print(f"[warn] Market analytics fetch failed, keeping previous data: {e}", file=sys.stderr)
    else:
        print("[info] Skipping market analytics refresh (within 1h window).")

    # ── Потоки капитала (DefiLlama): тоже не чаще раза в час ──
    capital_flows = existing.get("capital_flows")
    if should_refresh_capital_flows(existing):
        try:
            print("[info] Fetching capital flows (DefiLlama)...")
            cf_payload = fetch_capital_flows()
            cf_payload["updated_at"] = now.isoformat().replace("+00:00", "Z")
            capital_flows = cf_payload
            low_count = len(cf_payload["risk_tiers"].get("low", []))
            med_count = len(cf_payload["risk_tiers"].get("medium", []))
            high_count = len(cf_payload["risk_tiers"].get("high", []))
            print(f"[info] Capital flows refreshed: low={low_count} medium={med_count} high={high_count} assets")
        except Exception as e:
            print(f"[warn] Capital flows fetch failed, keeping previous data: {e}", file=sys.stderr)
    else:
        print("[info] Skipping capital flows refresh (within 1h window).")

    next_update = now + timedelta(minutes=UPDATE_CYCLE_MINUTES)
    output = {
        "updated_at": now.isoformat().replace("+00:00", "Z"),
        "next_update_at": next_update.isoformat().replace("+00:00", "Z"),
        "forex_updated_at": forex_updated_at,
        "assets": assets,
        "fear_greed": fear_greed,
        "market_analytics": market_analytics,
        "capital_flows": capital_flows,
    }

    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[info] Wrote {DATA_PATH}")


if __name__ == "__main__":
    main()
