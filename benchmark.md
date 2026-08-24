# Cartly Pipeline Benchmarking Results (v2.0)

This document details research-grade performance evaluations for the Cartly computer vision pipeline.

## 1. Overall Statistics
- **Total Videos Processed (Emulated scale)**: 100
- **Baseline Average Latency**: 0.00 ms (SD: 0.00 ms)
- **95% Confidence Interval (Analytic)**: [0.00, 0.00] ms
- **95% Bootstrap Confidence Interval**: [0.00, 0.00] ms

## 2. Latency Breakdown by Stage
| Stage | Average Latency (ms) | Average CPU (%) | Average RAM (MB) | Average GPU (%) | Average GPU Memory (MB) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| DOWNLOAD | 0.0 | NaN% | NaN | NaN% | NaN |
| EXTRACTION | 0.0 | NaN% | NaN | NaN% | NaN |
| YOLO | 0.0 | NaN% | NaN | NaN% | NaN |
| TRACKING | 0.0 | NaN% | NaN | NaN% | NaN |
| OCR | 0.0 | NaN% | NaN | NaN% | NaN |
| SEARCH | 0.0 | NaN% | NaN | NaN% | NaN |
| VERIFICATION | 0.0 | NaN% | NaN | NaN% | NaN |

## 3. Retrieval Performance comparison across Configurations
| Configuration | Precision@1 | Precision@5 | MRR | nDCG | mAP |
| :--- | :---: | :---: | :---: | :---: | :---: |

## 4. Ablation Study Results
| Configuration | Precision | Recall | F1 Score | Latency (ms) |
| :--- | :---: | :---: | :---: | :---: |
