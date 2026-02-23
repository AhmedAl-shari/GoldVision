#!/usr/bin/env python3
"""Run observability unit tests."""
import pytest
import sys
import os

# Add the backend src directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend', 'src')))

if __name__ == "__main__":
    # Run pytest on the test_observability.py file
    pytest.main([
        os.path.join(os.path.dirname(__file__), 'backend', 'src', 'tests', 'test_observability.py'),
        '-v',
        '--tb=short'
    ])
