#!/usr/bin/env python3
"""Integration tests for the backtest API."""

import requests
import json
import os


def test_backtest_api():
    """Test the /backtest API endpoint."""
    print("Testing /backtest API endpoint...")
    
    # Test the API endpoint
    response = requests.get(
        "http://localhost:8000/backtest",
        params={
            "horizon": 7,
            "step": 5,
            "min_train": 30,
            "max_cutoffs": 2
        }
    )
    
    assert response.status_code == 200, f"API should return 200, got {response.status_code}: {response.text}"
    
    data = response.json()
    assert "rows" in data, "Response should contain 'rows'"
    assert "avg" in data, "Response should contain 'avg'"
    assert "params" in data, "Response should contain 'params'"
    
    # Verify params match what we sent
    assert data["params"]["horizon"] == 7, "Params should match request"
    assert data["params"]["step"] == 5, "Params should match request"
    assert data["params"]["min_train"] == 30, "Params should match request"
    assert data["params"]["max_cutoffs"] == 2, "Params should match request"
    
    # Verify rows structure
    rows = data["rows"]
    assert len(rows) > 0, "Should have at least one cutoff result"
    
    for row in rows:
        assert "cutoff" in row, "Each row should have 'cutoff'"
        assert "mae" in row, "Each row should have 'mae'"
        assert "mape" in row, "Each row should have 'mape'"
        assert "n_points" in row, "Each row should have 'n_points'"
        assert row["mae"] >= 0, f"MAE should be non-negative, got {row['mae']}"
        assert row["mape"] >= 0, f"MAPE should be non-negative, got {row['mape']}"
    
    # Verify avg structure
    avg = data["avg"]
    assert "avg_mae" in avg, "Summary should have 'avg_mae'"
    assert "avg_mape" in avg, "Summary should have 'avg_mape'"
    assert "std_mae" in avg, "Summary should have 'std_mae'"
    assert "std_mape" in avg, "Summary should have 'std_mape'"
    assert "total_points" in avg, "Summary should have 'total_points'"
    
    print(f"✅ API endpoint returns correct structure")
    print(f"✅ API returned {len(rows)} cutoff results")
    print(f"✅ Average MAE: {avg['avg_mae']:.2f}")
    print(f"✅ Average MAPE: {avg['avg_mape']:.2f}%")


def test_download_endpoint():
    """Test the /backtest/download endpoint."""
    print("\nTesting /backtest/download endpoint...")
    
    response = requests.get("http://localhost:8000/backtest/download")
    
    assert response.status_code == 200, f"Download should return 200, got {response.status_code}"
    content_type = response.headers.get("content-type", "")
    assert "csv" in content_type or "text" in content_type, f"Should return CSV content type, got {content_type}"
    
    # Check CSV content
    lines = response.text.strip().split('\n')
    assert len(lines) > 1, "CSV should have header and data rows"
    
    # Check header
    header = lines[0].split(',')
    expected_columns = ['cutoff', 'mae', 'mape', 'n_points', 'actual_mean', 'predicted_mean', 'actual_std', 'predicted_std']
    for col in expected_columns:
        assert col in header, f"CSV should have '{col}' column"
    
    print("✅ Download endpoint returns valid CSV")


def test_mae_mape_calculations():
    """Test MAE and MAPE calculations with known data."""
    print("\nTesting MAE/MAPE calculations...")
    
    import numpy as np
    
    # Create test data
    actual = np.array([100.0, 110.0, 105.0, 120.0, 115.0])
    predicted = np.array([102.0, 108.0, 107.0, 118.0, 117.0])
    
    # Calculate expected values
    mae = np.mean(np.abs(actual - predicted))
    mape = np.mean(np.abs((actual - predicted) / actual)) * 100
    
    # Expected: MAE = mean(|100-102|, |110-108|, |105-107|, |120-118|, |115-117|)
    # Expected: MAE = mean(2, 2, 2, 2, 2) = 2.0
    # Expected: MAPE = mean(|2/100|, |2/110|, |2/105|, |2/120|, |2/115|) * 100
    # Expected: MAPE = mean(0.02, 0.018, 0.019, 0.017, 0.017) * 100 ≈ 1.82%
    
    assert abs(mae - 2.0) < 0.001, f"Expected MAE ≈ 2.0, got {mae}"
    assert abs(mape - 1.82) < 0.1, f"Expected MAPE ≈ 1.82%, got {mape}"
    
    print(f"✅ MAE calculation: {mae:.2f} (expected: 2.0)")
    print(f"✅ MAPE calculation: {mape:.2f}% (expected: ~1.82%)")


if __name__ == "__main__":
    print("🧪 Running backtest API tests...")
    
    try:
        test_mae_mape_calculations()
        test_backtest_api()
        test_download_endpoint()
        
        print("\n🎉 All tests passed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
