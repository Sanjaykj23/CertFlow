#!/bin/sh
if command -v mvn >/dev/null 2>&1; then
    exec mvn "$@"
else
    echo "Maven not found in PATH"
    exit 1
fi
