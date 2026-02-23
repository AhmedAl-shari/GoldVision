#!/usr/bin/env python3
"""Test script for enhanced Prometheus metrics."""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend', 'src'))

from core.metrics import Metrics

def test_metrics():
    """Test the enhanced metrics functionality."""
    metrics = Metrics()
    
    # Test basic counters
    metrics.increment_counter("test_counter")
    metrics.increment_counter("test_labeled_counter", {"label1": "value1", "label2": "value2"})
    
    # Test HTTP request recording
    metrics.record_request("GET", "/api/prices", 200, 0.150)
    metrics.record_request("POST", "/api/forecast", 201, 0.250)
    metrics.record_request("GET", "/api/prices", 404, 0.050)
    
    # Test cache metrics
    metrics.record_cache_hit()
    metrics.record_cache_miss()
    
    # Test provider failures
    metrics.record_provider_failure("dummy")
    metrics.increment_provider_failures()
    
    # Generate Prometheus format
    prometheus_output = metrics.to_prometheus_format()
    
    print("=== Prometheus Metrics Output ===")
    print(prometheus_output)
    print("\n=== Metrics Dictionary ===")
    print(metrics.to_dict())

if __name__ == "__main__":
    test_metrics()
