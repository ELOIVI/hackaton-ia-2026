from __future__ import annotations

from typing import Any

import pandas as pd


def _is_housing_instability(value: Any) -> bool:
    text = str(value or "").strip().lower()
    return any(token in text for token in ("infra", "sense", "ocup", "alberg", "precari"))


def _is_irregular_status(value: Any) -> bool:
    text = str(value or "").strip().lower()
    return text in {"3", "irregular", "sense_documentacio", "sense documentacio"}


def _is_digital_gap(value: Any) -> bool:
    text = str(value or "").strip().lower()
    return text in {"baixa", "molt_baixa", "no", "sense", "0"}


def build_expedient_analytics(expedients: list[dict[str, Any]]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    recursos_rows: list[dict[str, Any]] = []

    for exp in expedients:
        fitxa = exp.get("fitxa") or {}
        rows.append(
            {
                "id": exp.get("id"),
                "estat": str(exp.get("estat", "actiu")),
                "urgencia": str(exp.get("urgencia", "mitjana")),
                "municipi": str(fitxa.get("municipi", "Desconegut") or "Desconegut"),
                "tipus_habitatge": fitxa.get("tipus_habitatge"),
                "ciutadania": fitxa.get("ciutadania"),
                "alfabetitzacio_digital": fitxa.get("alfabetitzacio_digital"),
                "created_by_user_id": exp.get("created_by_user_id"),
                "resolved_by_user_id": exp.get("resolved_by_user_id"),
            }
        )

        for rec in exp.get("recursos_assignats", []) or []:
            recursos_rows.append(
                {
                    "expedient_id": exp.get("id"),
                    "tipus": str((rec or {}).get("tipus", "altres") or "altres"),
                }
            )

    df = pd.DataFrame(rows)
    total = int(len(df))
    if total == 0:
        return {
            "totals": {
                "expedients": 0,
                "actius": 0,
                "tancats": 0,
                "urgents": 0,
            },
            "context_metrics": {
                "housing_instability_pct": 0.0,
                "irregular_status_pct": 0.0,
                "digital_gap_risk_pct": 0.0,
            },
            "top_municipis": [],
            "recursos_distribution": [],
            "resolts_per_treballador": [],
        }

    df["is_housing_instability"] = df["tipus_habitatge"].apply(_is_housing_instability)
    df["is_irregular_status"] = df["ciutadania"].apply(_is_irregular_status)
    df["is_digital_gap"] = df["alfabetitzacio_digital"].apply(_is_digital_gap)

    totals = {
        "expedients": total,
        "actius": int((df["estat"] == "actiu").sum()),
        "tancats": int((df["estat"] == "tancat").sum()),
        "urgents": int(df["urgencia"].isin(["alta", "critica"]).sum()),
    }

    context_metrics = {
        "housing_instability_pct": round(float(df["is_housing_instability"].mean() * 100), 1),
        "irregular_status_pct": round(float(df["is_irregular_status"].mean() * 100), 1),
        "digital_gap_risk_pct": round(float(df["is_digital_gap"].mean() * 100), 1),
    }

    municipis = (
        df.groupby("municipi", dropna=False)
        .size()
        .sort_values(ascending=False)
        .head(8)
        .reset_index(name="count")
    )
    top_municipis = municipis.to_dict(orient="records")

    recursos_distribution: list[dict[str, Any]] = []
    if recursos_rows:
        rec_df = pd.DataFrame(recursos_rows)
        recursos_distribution = (
            rec_df.groupby("tipus")
            .size()
            .sort_values(ascending=False)
            .head(10)
            .reset_index(name="count")
            .to_dict(orient="records")
        )

    resolts_per_treballador = (
        df[df["resolved_by_user_id"].notna() & (df["resolved_by_user_id"].astype(str) != "")]
        .groupby("resolved_by_user_id")
        .size()
        .sort_values(ascending=False)
        .head(10)
        .reset_index(name="count")
        .rename(columns={"resolved_by_user_id": "user_id"})
        .to_dict(orient="records")
    )

    return {
        "totals": totals,
        "context_metrics": context_metrics,
        "top_municipis": top_municipis,
        "recursos_distribution": recursos_distribution,
        "resolts_per_treballador": resolts_per_treballador,
    }
