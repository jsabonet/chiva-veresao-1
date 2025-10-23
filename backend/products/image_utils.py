import os
from io import BytesIO
from PIL import Image


TARGET_WIDTHS = [320, 640, 1024]


def _variant_path(original_path: str, width: int, ext: str = "webp") -> str:
    base, _ = os.path.splitext(original_path)
    return f"{base}-{width}.{ext}"


def generate_webp_variants(image_path: str) -> None:
    """Generate WebP variants at multiple widths for a given image path.

    Creates files alongside the original with the pattern: name-<width>.webp
    Skips generation if the variant exists and is newer than the source.
    """
    try:
        if not image_path or not os.path.exists(image_path):
            return

        with Image.open(image_path) as img:
            # Convert to RGB to avoid issues with PNG/CMYK, etc.
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGB")

            orig_w, orig_h = img.size
            if orig_w == 0 or orig_h == 0:
                return

            for w in TARGET_WIDTHS:
                # Keep the filename as requested width to match frontend URLs,
                # but never upscale the actual image content beyond original width
                target_w = min(w, orig_w)
                variant = _variant_path(image_path, w, "webp")
                try:
                    src_mtime = os.path.getmtime(image_path)
                    if os.path.exists(variant) and os.path.getmtime(variant) >= src_mtime:
                        continue
                except Exception:
                    pass

                # Create resized copy preserving aspect ratio
                ratio = target_w / float(orig_w)
                h = int(orig_h * ratio)
                resized = img.resize((target_w, h), Image.LANCZOS)

                # Save as WebP with reasonable quality
                params = {"format": "WEBP", "quality": 80, "method": 6}
                # Preserve transparency where applicable
                if resized.mode == "RGBA":
                    params["lossless"] = False
                resized.save(variant, **params)
    except Exception:
        # Fail-safe: never break the request path due to optimization issues
        return
