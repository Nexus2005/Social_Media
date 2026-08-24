# Cartly Pipeline Benchmarking Results

This document contains research-grade performance evaluations for the Cartly computer vision pipeline.

## Overall Statistics
- **Total Videos Processed**: 2
- **Average Latency**: 471792.50 ms (SD: 376938.12 ms)
- **95% Confidence Interval (Analytic)**: [-50617.08, 994202.08] ms
- **95% Bootstrap Confidence Interval**: [205257.00, 738328.00] ms

## Latency Breakdown by Stage
| Stage | Average Latency (ms) | Average CPU (%) | Average RAM (MB) | Average GPU (%) | Average GPU Memory (MB) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| DOWNLOAD | 3398.5 | 11.4% | 13664.5 | 0.0% | 0.0 |
| EXTRACTION | 2032.5 | 11.4% | 13656.9 | 0.0% | 0.0 |
| YOLO | 752.0 | 11.4% | 13564.8 | 0.0% | 0.0 |
| TRACKING | 105.0 | 11.4% | 13537.2 | 0.0% | 0.0 |
| OCR | 7919.0 | 11.4% | 13515.8 | 0.0% | 0.0 |
| SEARCH | 62510.5 | 11.4% | 13453.8 | 0.0% | 0.0 |
| VERIFICATION | 71.0 | 11.4% | 13259.0 | 0.0% | 0.0 |
