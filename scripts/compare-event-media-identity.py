"""Compare source-page imagery with reusable-media candidates.

This is a discovery aid only. It downloads images into memory, computes perceptual
fingerprints and writes comparison metadata to the private review area. It never
publishes or retains third-party image files.
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import pathlib
import urllib.parse
import urllib.request

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError


ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIT_PATH = ROOT / "private-data" / "professional" / "event-media-audit.json"
COMMONS_PATH = ROOT / "private-data" / "professional" / "event-media-candidates.json"
SOURCES_PATH = (
    ROOT / "private-data" / "professional" / "event-source-media-candidates.json"
)
OUTPUT_PATH = (
    ROOT / "private-data" / "professional" / "event-media-identity-comparisons.json"
)
USER_AGENT = "ARCUS event-media identity review/1.0"
MAX_BYTES = 18 * 1024 * 1024


def load_json(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_url(url: str, source_page_url: str | None = None) -> str:
    if url.startswith("//"):
        return "https:" + url
    if source_page_url:
        return urllib.parse.urljoin(source_page_url, url)
    return url


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=25) as response:
        content_type = response.headers.get("Content-Type", "").lower()
        if "image/" not in content_type and not url.lower().split("?")[0].endswith(
            (".jpg", ".jpeg", ".png", ".webp")
        ):
            raise ValueError(f"not an image response: {content_type or 'unknown'}")
        body = response.read(MAX_BYTES + 1)
        if len(body) > MAX_BYTES:
            raise ValueError("image exceeds review download limit")
        return body


def dct_matrix(size: int) -> np.ndarray:
    x = np.arange(size)
    k = np.arange(size)[:, None]
    matrix = np.cos(math.pi * (2 * x + 1) * k / (2 * size))
    matrix[0, :] *= math.sqrt(1 / size)
    matrix[1:, :] *= math.sqrt(2 / size)
    return matrix


DCT_32 = dct_matrix(32)


def fingerprint(data: bytes) -> dict:
    with Image.open(io.BytesIO(data)) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
        width, height = image.size

        grayscale = np.asarray(image.resize((32, 32)).convert("L"), dtype=np.float32)
        transformed = DCT_32 @ grayscale @ DCT_32.T
        low = transformed[:8, :8].copy()
        median = float(np.median(low.flatten()[1:]))
        phash = (low > median).flatten()

        difference_image = np.asarray(
            image.resize((17, 16)).convert("L"), dtype=np.int16
        )
        dhash = (difference_image[:, 1:] > difference_image[:, :-1]).flatten()

        sample = np.asarray(image.resize((128, 128)), dtype=np.float32)
        histograms = []
        for channel in range(3):
            histogram, _ = np.histogram(sample[:, :, channel], bins=16, range=(0, 256))
            histograms.append(histogram.astype(np.float64))
        histogram = np.concatenate(histograms)
        norm = np.linalg.norm(histogram)
        if norm:
            histogram /= norm

    return {
        "sha256": hashlib.sha256(data).hexdigest(),
        "width": width,
        "height": height,
        "phash": phash,
        "dhash": dhash,
        "histogram": histogram,
    }


def hamming(left: np.ndarray, right: np.ndarray) -> float:
    return float(np.count_nonzero(left != right) / left.size)


def compare(left: dict, right: dict) -> dict:
    exact = left["sha256"] == right["sha256"]
    phash_distance = hamming(left["phash"], right["phash"])
    dhash_distance = hamming(left["dhash"], right["dhash"])
    histogram_similarity = float(np.dot(left["histogram"], right["histogram"]))
    left_aspect = left["width"] / left["height"]
    right_aspect = right["width"] / right["height"]
    aspect_similarity = min(left_aspect, right_aspect) / max(left_aspect, right_aspect)
    score = (
        (1 - phash_distance) * 0.55
        + (1 - dhash_distance) * 0.25
        + histogram_similarity * 0.15
        + aspect_similarity * 0.05
    )

    if exact:
        status = "exact_binary_match"
    elif (phash_distance <= 0.10 and dhash_distance <= 0.16) or (
        phash_distance <= 0.08 and histogram_similarity >= 0.80
    ):
        status = "strong_visual_match"
    elif phash_distance <= 0.22 and dhash_distance <= 0.28 and score >= 0.75:
        status = "possible_visual_match"
    else:
        status = "no_automatic_match"

    return {
        "automatic_status": status,
        "similarity_score": round(score, 4),
        "phash_distance": round(phash_distance, 4),
        "dhash_distance": round(dhash_distance, 4),
        "histogram_similarity": round(histogram_similarity, 4),
        "aspect_similarity": round(aspect_similarity, 4),
        "source_dimensions": [left["width"], left["height"]],
        "candidate_dimensions": [right["width"], right["height"]],
    }


def main() -> None:
    audit = load_json(AUDIT_PATH)
    commons_payload = load_json(COMMONS_PATH)
    source_payload = load_json(SOURCES_PATH)
    review_ids = {
        record["event_id"]
        for record in audit["records"]
        if record["review_status"] == "review_required"
    }
    commons_by_event = {
        record["event_id"]: [
            candidate
            for candidate in record.get("candidates", [])
            if str(candidate.get("mime_type", "")).startswith("image/")
            and candidate.get("thumbnail_url")
        ]
        for record in commons_payload.get("records", [])
        if record["event_id"] in review_ids
    }
    sources_by_event = {
        record["event_id"]: [
            candidate
            for candidate in record.get("media_candidates", [])
            if candidate.get("media_url")
            and not str(candidate["media_url"]).endswith("undefined")
        ]
        for record in source_payload.get("records", [])
        if record["event_id"] in review_ids
    }

    cache: dict[str, dict | Exception] = {}

    def get_fingerprint(url: str) -> dict:
        if url not in cache:
            try:
                cache[url] = fingerprint(fetch_bytes(url))
            except (
                OSError,
                ValueError,
                urllib.error.URLError,
                UnidentifiedImageError,
            ) as error:
                cache[url] = error
        value = cache[url]
        if isinstance(value, Exception):
            raise value
        return value

    records = []
    for event_id in sorted(review_ids):
        commons_candidates = commons_by_event.get(event_id, [])
        source_candidates = sources_by_event.get(event_id, [])
        if not commons_candidates or not source_candidates:
            continue

        comparisons = []
        errors = []
        for source in source_candidates:
            source_url = normalize_url(source["media_url"], source.get("source_url"))
            try:
                source_fingerprint = get_fingerprint(source_url)
            except Exception as error:  # review output must retain failed candidates
                errors.append({"url": source_url, "error": str(error)})
                continue

            for candidate in commons_candidates:
                candidate_url = normalize_url(candidate["thumbnail_url"])
                try:
                    candidate_fingerprint = get_fingerprint(candidate_url)
                except Exception as error:
                    errors.append({"url": candidate_url, "error": str(error)})
                    continue
                metrics = compare(source_fingerprint, candidate_fingerprint)
                comparisons.append(
                    {
                        "source_page_url": source.get("source_url"),
                        "source_media_review_url": source_url,
                        "candidate_title": candidate.get("title"),
                        "candidate_source_page_url": candidate.get("source_page_url"),
                        "candidate_thumbnail_review_url": candidate_url,
                        "candidate_license_id": candidate.get("license_id"),
                        **metrics,
                    }
                )

        comparisons.sort(key=lambda item: item["similarity_score"], reverse=True)
        records.append(
            {
                "event_id": event_id,
                "comparison_count": len(comparisons),
                "comparisons": comparisons,
                "download_errors": errors,
            }
        )

    status_counts: dict[str, int] = {}
    for record in records:
        for comparison in record["comparisons"]:
            status = comparison["automatic_status"]
            status_counts[status] = status_counts.get(status, 0) + 1

    output = {
        "schema_version": "arcus-event-media-identity-comparison-v1",
        "notice": (
            "Automatic perceptual comparison for discovery only. A visual match does not "
            "establish bridge identity, event phase, authorship or reuse rights; every "
            "candidate requires manual documentary review before publication."
        ),
        "review_event_count": len(review_ids),
        "events_with_comparable_images": len(records),
        "comparison_count": sum(record["comparison_count"] for record in records),
        "automatic_status_counts": status_counts,
        "records": records,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "review_events": output["review_event_count"],
                "events_with_comparable_images": output[
                    "events_with_comparable_images"
                ],
                "comparisons": output["comparison_count"],
                "automatic_status_counts": status_counts,
                "output": str(OUTPUT_PATH.relative_to(ROOT)),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
