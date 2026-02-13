import argparse
import json
import re
from pathlib import Path
from urllib.parse import quote

import gspread
from google.oauth2.service_account import Credentials

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def normalize_key(text: str) -> str:
    value = (text or "").strip().upper()
    value = value.replace("Ñ", "N")
    value = re.sub(r"[^A-Z0-9]+", "_", value)
    return re.sub(r"_+", "_", value).strip("_")


def col_to_letter(col_idx_zero_based: int) -> str:
    n = col_idx_zero_based + 1
    out = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        out = chr(65 + r) + out
    return out


def detect_header_row(values):
    for i in range(min(20, len(values))):
        row = [str(c or "").strip().upper() for c in values[i]]
        if "ARTICULO" in row:
            return i
    return None


def normalize_header(text: str) -> str:
    value = (text or "").strip().upper()
    value = value.replace("Á", "A").replace("É", "E").replace("Í", "I").replace("Ó", "O").replace("Ú", "U")
    value = re.sub(r"\s+", " ", value)
    return value


def find_header_index(headers, candidates):
    normalized = [normalize_header(h) for h in headers]
    candidate_set = {normalize_header(c) for c in candidates}
    for idx, h in enumerate(normalized):
        if h in candidate_set:
            return idx
    return None


def build_filename_map(images_dir: Path):
    mapping = {}
    for path in images_dir.iterdir():
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"}:
            continue
        key = normalize_key(path.stem)
        mapping[key] = path.name
    return mapping


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sheet-id", required=True)
    parser.add_argument("--sheet-name", default="GENERAL")
    parser.add_argument("--images-dir", default="img/product")
    parser.add_argument("--repo-owner", required=True)
    parser.add_argument("--repo-name", required=True)
    parser.add_argument("--repo-ref", default="main")
    parser.add_argument("--repo-path", default="img/product")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    # env-only to avoid accidental key commits
    import os
    raw_sa = os.environ.get("GCP_SA_JSON")
    if not raw_sa:
        raise SystemExit("GCP_SA_JSON missing")
    creds_info = json.loads(raw_sa)

    images_dir = Path(args.images_dir)
    if not images_dir.exists():
        raise SystemExit(f"images dir not found: {images_dir}")

    filename_map = build_filename_map(images_dir)
    if not filename_map:
        raise SystemExit("no images found")

    creds = Credentials.from_service_account_info(creds_info, scopes=SCOPES)
    gc = gspread.authorize(creds)
    ws = gc.open_by_key(args.sheet_id).worksheet(args.sheet_name)
    values = ws.get_all_values()
    header_row = detect_header_row(values)
    if header_row is None:
        raise SystemExit("GENERAL headers not found")

    headers = [str(c or "").strip() for c in values[header_row]]
    idx_art = find_header_index(headers, ["ARTICULO", "ARTÍCULO"])
    idx_url_gh = find_header_index(headers, ["URL GH", "GH URL", "URL_GH"])
    idx_url_cdn = find_header_index(headers, ["URL", "URL CDN", "CDN URL"])
    idx_img_gh = find_header_index(headers, ["IMAGE GH", "GH IMAGE", "IMAGEN GH"])
    idx_img_cdn = find_header_index(headers, ["IMAGE", "IMAGEN", "IMAGE CDN"])

    if idx_art is None:
        raise SystemExit("ARTICULO header not found")
    if idx_url_gh is None and idx_url_cdn is None and idx_img_gh is None and idx_img_cdn is None:
        raise SystemExit("No URL/IMAGE target headers found")

    updates = []
    touched = 0

    for r in range(header_row + 1, len(values)):
        row = values[r]
        articulo = row[idx_art].strip() if idx_art < len(row) else ""
        if not articulo:
            continue
        key = normalize_key(articulo)
        filename = filename_map.get(key)
        if not filename:
            continue

        encoded_filename = quote(filename)
        gh_url = (
            f"https://github.com/{args.repo_owner}/{args.repo_name}/blob/{args.repo_ref}/"
            f"{args.repo_path}/{encoded_filename}?raw=true"
        )
        cdn_url = (
            f"https://cdn.jsdelivr.net/gh/{args.repo_owner}/{args.repo_name}@{args.repo_ref}/"
            f"{args.repo_path}/{encoded_filename}"
        )
        row_number = r + 1

        url_gh_a1 = f"{col_to_letter(idx_url_gh)}{row_number}" if idx_url_gh is not None else None
        url_cdn_a1 = f"{col_to_letter(idx_url_cdn)}{row_number}" if idx_url_cdn is not None else None
        img_gh_a1 = f"{col_to_letter(idx_img_gh)}{row_number}" if idx_img_gh is not None else None
        img_cdn_a1 = f"{col_to_letter(idx_img_cdn)}{row_number}" if idx_img_cdn is not None else None

        if url_gh_a1:
            updates.append({"range": url_gh_a1, "values": [[gh_url]]})
        if url_cdn_a1:
            updates.append({"range": url_cdn_a1, "values": [[cdn_url]]})

        if img_gh_a1:
            formula = f"=IMAGE({url_gh_a1})" if url_gh_a1 else f'=IMAGE("{gh_url}")'
            updates.append({"range": img_gh_a1, "values": [[formula]]})
        if img_cdn_a1:
            formula = f"=IMAGE({url_cdn_a1})" if url_cdn_a1 else f'=IMAGE("{cdn_url}")'
            updates.append({"range": img_cdn_a1, "values": [[formula]]})

        touched += 1

    if args.dry_run:
        print(json.dumps({"ok": True, "dry_run": True, "matched": touched}, ensure_ascii=False))
        return

    if updates:
        ws.batch_update(updates, value_input_option="USER_ENTERED")

    print(json.dumps({"ok": True, "matched": touched}, ensure_ascii=False))


if __name__ == "__main__":
    main()
