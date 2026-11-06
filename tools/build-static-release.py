"""Export the approved public assets from a commit into a fresh directory."""
import argparse
import io
from pathlib import Path, PurePosixPath
import subprocess
import tarfile
import tempfile


def git(*args):
    return subprocess.check_output(["git", *args])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--ref", default="HEAD")
    args = parser.parse_args()
    commit = git("rev-parse", "--verify", "--end-of-options", args.ref + "^{commit}").decode().strip()
    manifest = git("show", commit + ":tools/static-release-files.txt").decode()
    paths = manifest.splitlines()
    allowed_suffixes = {
        ".css", ".html", ".ico", ".jpeg", ".jpg", ".js", ".mjs", ".png",
        ".svg", ".txt", ".webmanifest", ".webp", ".woff", ".woff2", ".xml",
    }
    if not paths or paths != sorted(set(paths)):
        parser.error("The release manifest must be nonempty, sorted and unique")
    for path in paths:
        parts = path.split("/")
        if (
            any(not part or part.startswith(".") for part in parts)
            or PurePosixPath(path).suffix.lower() not in allowed_suffixes
            or any(char in path for char in "\\:*?[")
        ):
            parser.error(f"Unsafe static release path: {path!r}")

    with tarfile.open(fileobj=io.BytesIO(git("archive", "--format=tar", commit, "--", *paths))) as archive:
        files = set()
        for member in archive.getmembers():
            if member.isdir() and any(path.startswith(member.name + "/") for path in paths):
                continue
            if not member.isfile() or member.name not in paths or member.name in files:
                parser.error(f"Unexpected archive member: {member.name!r}")
            files.add(member.name)
        if files != set(paths):
            parser.error("Static archive is missing approved files")

        if args.destination.exists() or args.destination.is_symlink():
            parser.error("Use a fresh destination directory")
        with tempfile.TemporaryDirectory(dir=args.destination.parent) as staging:
            output = Path(staging) / "site"
            archive.extractall(output, filter="data")
            output.rename(args.destination)

    print(f"Exported {len(paths)} public files from {commit}")


if __name__ == "__main__":
    main()
