import argparse
import base64
import json
import os
import re
from urllib.parse import quote
import urllib.request
import urllib.error
from pathlib import Path

import gspread
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def normalize_filename(name: str) -> str:
    text = (name or "").strip().upper()
    text = re.sub(r"[^A-Z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text or "PRODUCTO"


def col_to_letter(col_idx_zero_based: int) -> str:
    n = col_idx_zero_based + 1
    out = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        out = chr(65 + r) + out
    return out


def detect_header_row(values):
    for i in range(min(15, len(values))):
        row = [str(c or "").strip().upper() for c in values[i]]
        if "ID" in row and "ARTICULO" in row:
            return i
    return None


def render_prompt(template: str, product_name: str, category: str, bg: str, visual: str):
    mapping = {
        "PRODUCT_NAME": (product_name or "").strip().upper(),
        "CATEGORY": (category or "").strip() or "SIN CATEGORIA",
        "BACKGROUND_COLOR_DIRECTION": (bg or "warm neutral kraft beige textured backdrop").strip(),
        "PRODUCT_VISUAL": (visual or product_name or "natural product texture").strip(),
    }
    return template.format_map(mapping)


def generate_image_b64(prompt: str, api_key: str, model: str = "gpt-image-1", size: str = "1024x1024"):
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
    }
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        raw = err.read().decode("utf-8", errors="replace") if hasattr(err, "read") else ""
        raise RuntimeError(f"OpenAI HTTP {err.code}: {raw}") from err
    data = body.get("data") or []
    if not data or not data[0].get("b64_json"):
        raise RuntimeError(f"OpenAI image response invalid: {body}")
    return data[0]["b64_json"]


def generate_image_with_fallback(prompt: str, api_key: str, models: list[str], size: str):
    last = None
    for model in models:
        try:
            return generate_image_b64(prompt, api_key, model=model, size=size), model
        except Exception as exc:
            last = exc
    raise RuntimeError(f"All models failed ({models}): {last}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--product-name", required=True)
    parser.add_argument("--category", default="")
    parser.add_argument("--sheet-id", required=True)
    parser.add_argument("--sheet-name", default="GENERAL")
    parser.add_argument("--repo-owner", required=True)
    parser.add_argument("--repo-name", required=True)
    parser.add_argument("--repo-ref", default="main")
    parser.add_argument("--repo-path", default="img/product")
    parser.add_argument("--out-dir", default="img/product")
    parser.add_argument("--prompt-file", default="/tmp/prompt_casabert.txt")
    parser.add_argument("--model", default="gpt-image-1")
    parser.add_argument("--fallback-model", default="dall-e-3")
    parser.add_argument("--size", default="1024x1024")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY missing")

    sa_json = os.environ.get("GCP_SA_JSON")
    if not sa_json:
        raise SystemExit("GCP_SA_JSON missing")

    prompt_template = Path(args.prompt_file).read_text(encoding="utf-8")
    product_name = args.product_name.strip()
    filename = f"{normalize_filename(product_name)}.png"
    out_path = Path(args.out_dir) / filename
    out_path.parent.mkdir(parents=True, exist_ok=True)

    creds_info = json.loads(sa_json)
    creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
    gc = gspread.authorize(creds)
    ws = gc.open_by_key(args.sheet_id).worksheet(args.sheet_name)
    values = ws.get_all_values()
    header_row = detect_header_row(values)
    if header_row is None:
        raise SystemExit("GENERAL header not found")

    headers = [str(c or "").strip().upper() for c in values[header_row]]
    idx_art = headers.index("ARTICULO") if "ARTICULO" in headers else None
    idx_cat = headers.index("CATEGORIA") if "CATEGORIA" in headers else None
    idx_url = headers.index("URL") if "URL" in headers else None
    idx_img = headers.index("IMAGE") if "IMAGE" in headers else None
    idx_bg = headers.index("BACKGROUND_COLOR_DIRECTION") if "BACKGROUND_COLOR_DIRECTION" in headers else None
    idx_visual = headers.index("PRODUCT_VISUAL") if "PRODUCT_VISUAL" in headers else None
    if idx_art is None or idx_url is None or idx_img is None:
        raise SystemExit("ARTICULO/URL/IMAGE required")

    target_row = None
    row_number = None
    for r in range(header_row + 1, len(values)):
        row = values[r]
        art = row[idx_art].strip() if idx_art < len(row) else ""
        if art.upper() == product_name.upper():
            target_row = row
            row_number = r + 1
            break
    if not target_row:
        raise SystemExit(f"Product not found in GENERAL: {product_name}")

    cat = args.category or (target_row[idx_cat].strip() if idx_cat is not None and idx_cat < len(target_row) else "")
    bg = target_row[idx_bg].strip() if idx_bg is not None and idx_bg < len(target_row) else ""
    visual = target_row[idx_visual].strip() if idx_visual is not None and idx_visual < len(target_row) else ""

    prompt = render_prompt(prompt_template, product_name, cat, bg, visual)
    models = [m for m in [args.model, args.fallback_model] if m]
    b64, used_model = generate_image_with_fallback(prompt, api_key, models=models, size=args.size)
    out_path.write_bytes(base64.b64decode(b64))

    encoded_filename = quote(filename)
    cdn_url = (
        f"https://cdn.jsdelivr.net/gh/{args.repo_owner}/{args.repo_name}@{args.repo_ref}/"
        f"{args.repo_path}/{encoded_filename}"
    )
    url_a1 = f"{col_to_letter(idx_url)}{row_number}"
    img_a1 = f"{col_to_letter(idx_img)}{row_number}"
    ws.update(range_name=url_a1, values=[[cdn_url]], value_input_option="USER_ENTERED")
    ws.update(range_name=img_a1, values=[[f"=IMAGE({url_a1})"]], value_input_option="USER_ENTERED")

    print(json.dumps({
        "ok": True,
        "product": product_name,
        "model": used_model,
        "file": str(out_path),
        "cdn_url": cdn_url,
    }))


if __name__ == "__main__":
    main()
