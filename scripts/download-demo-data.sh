#!/bin/bash
# Download UWF-ZeekData24 demo dataset with MITRE ATT&CK labels
# Source: https://datasets.uwf.edu/ (CC-BY License)

set -e

DATA_DIR="data/uwf-zeekdata24"
mkdir -p "$DATA_DIR"

echo "Downloading UWF-ZeekData24 dataset (MITRE ATT&CK labeled)..."
echo "Source: University of West Florida Cyber Range"
echo "License: CC-BY"
echo ""

# Week 1 (Feb 25 - Mar 3, 2024)
echo "Downloading week 1..."
curl -L -o "$DATA_DIR/week1.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-02-25%20-%202024-03-03/part-00000-8b838a85-76eb-4896-a0b6-2fc425e828c2-c000.snappy.parquet"

# Week 2 (Mar 3 - Mar 10, 2024)
echo "Downloading week 2..."
curl -L -o "$DATA_DIR/week2.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-03-03%20-%202024-03-10/part-00000-0955ed97-8460-41bd-872a-7375a7f0207e-c000.snappy.parquet"

# Week 3 (Mar 10 - Mar 17, 2024)
echo "Downloading week 3..."
curl -L -o "$DATA_DIR/week3.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-03-10%20-%202024-03-17/part-00000-071774ae-97f3-4f31-9700-8bfcdf41305a-c000.snappy.parquet"

# Week 4 (Mar 17 - Mar 24, 2024)
echo "Downloading week 4..."
curl -L -o "$DATA_DIR/week4.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-03-17%20-%202024-03-24/part-00000-5f556208-a1fc-40a1-9cc2-a4e24c76aeb3-c000.snappy.parquet"

# Week 5 (Mar 24 - Mar 31, 2024)
echo "Downloading week 5..."
curl -L -o "$DATA_DIR/week5.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-03-24%20-%202024-03-31/part-00000-ea3a47a3-0973-4d6b-a3a2-8dd441ee7901-c000.snappy.parquet"

# Week 6 (Oct 27 - Nov 3, 2024)
echo "Downloading week 6..."
curl -L -o "$DATA_DIR/week6.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-10-27%20-%202024-11-03/part-00000-69700ccb-c1c1-4763-beb7-cd0f1a61c268-c000.snappy.parquet"

# Week 7 (Nov 3 - Nov 10, 2024)
echo "Downloading week 7..."
curl -L -o "$DATA_DIR/week7.parquet" \
  "https://datasets.uwf.edu/data/UWF-ZeekData24/parquet/2024-11-03%20-%202024-11-10/part-00000-f078acc1-ab56-40a6-a6e1-99d780645c57-c000.snappy.parquet"

echo ""
echo "Download complete!"
echo ""
echo "To convert to nfchat format, run:"
echo "  python3 scripts/convert-zeekdata24.py"
