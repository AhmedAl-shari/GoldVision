#!/usr/bin/env python3
"""Quick test to verify fixes."""

import sys
import os

# Add backend to path
sys.path.insert(0, '/Users/ahmedalshari/Desktop/Gold/goldvision/backend')

def test_metrics_import():
    """Test that metrics can be imported without errors."""
    try:
        from src.core.metrics import Metrics
        print("✅ Metrics import successful")
        
        # Test creating a metrics instance
        metrics = Metrics()
        print("✅ Metrics instance creation successful")
        
        # Test histogram recording
        metrics.record_histogram("test_histogram", 1.0, {"label1": "value1"})
        print("✅ Histogram recording successful")
        
        return True
    except Exception as e:
        print(f"❌ Metrics test failed: {e}")
        return False

def test_provider_status_import():
    """Test that provider status service can be imported."""
    try:
        from src.services.provider_status_service import ProviderStatusService
        print("✅ Provider status service import successful")
        return True
    except Exception as e:
        print(f"❌ Provider status import failed: {e}")
        return False

def test_backtest_import():
    """Test that backtest service can be imported."""
    try:
        from src.services.backtest_service import BacktestService
        print("✅ Backtest service import successful")
        return True
    except Exception as e:
        print(f"❌ Backtest service import failed: {e}")
        return False

def main():
    """Run quick tests."""
    print("🔧 Quick Fix Verification")
    print("=" * 30)
    
    tests = [
        ("Metrics Import", test_metrics_import),
        ("Provider Status Import", test_provider_status_import),
        ("Backtest Import", test_backtest_import),
    ]
    
    passed = 0
    for test_name, test_func in tests:
        print(f"\n{test_name}:")
        if test_func():
            passed += 1
    
    print(f"\n📋 Results: {passed}/{len(tests)} tests passed")
    
    if passed == len(tests):
        print("🎉 All imports working correctly!")
        return 0
    else:
        print("⚠️  Some imports failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
