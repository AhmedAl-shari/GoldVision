#!/usr/bin/env python3
"""
Simple performance test for GoldVision API.
"""

import argparse
import time
import requests
import statistics
from datetime import datetime

def test_endpoint(url, method="GET", data=None, headers=None):
    """Test a single endpoint and return timing information."""
    start_time = time.time()
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        
        end_time = time.time()
        return {
            "success": True,
            "status_code": response.status_code,
            "response_time": end_time - start_time,
            "error": None
        }
    except Exception as e:
        end_time = time.time()
        return {
            "success": False,
            "status_code": None,
            "response_time": end_time - start_time,
            "error": str(e)
        }

def run_performance_test(base_url, num_requests=50):
    """Run performance tests against the API."""
    print(f"🚀 Running performance test with {num_requests} requests...")
    
    # Test endpoints
    endpoints = [
        {"url": f"{base_url}/health", "method": "GET"},
        {"url": f"{base_url}/prices", "method": "GET"},
        {"url": f"{base_url}/provider/status", "method": "GET"},
        {"url": f"{base_url}/admin/metrics", "method": "GET"},
    ]
    
    results = {}
    
    for endpoint in endpoints:
        print(f"  Testing {endpoint['method']} {endpoint['url']}...")
        
        response_times = []
        success_count = 0
        error_count = 0
        
        for i in range(num_requests):
            result = test_endpoint(
                endpoint["url"], 
                method=endpoint["method"]
            )
            
            if result["success"]:
                response_times.append(result["response_time"])
                success_count += 1
            else:
                error_count += 1
            
            # Small delay to avoid overwhelming the server
            time.sleep(0.1)
        
        # Calculate statistics
        if response_times:
            avg_time = statistics.mean(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            median_time = statistics.median(response_times)
        else:
            avg_time = min_time = max_time = median_time = 0
        
        results[endpoint["url"]] = {
            "total_requests": num_requests,
            "success_count": success_count,
            "error_count": error_count,
            "success_rate": (success_count / num_requests) * 100,
            "avg_response_time": avg_time,
            "min_response_time": min_time,
            "max_response_time": max_time,
            "median_response_time": median_time
        }
    
    return results

def generate_report(results, output_file=None):
    """Generate a performance test report."""
    report = []
    report.append("GoldVision API Performance Test Report")
    report.append("=" * 50)
    report.append(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    for url, stats in results.items():
        report.append(f"Endpoint: {url}")
        report.append(f"  Total Requests: {stats['total_requests']}")
        report.append(f"  Successful: {stats['success_count']}")
        report.append(f"  Errors: {stats['error_count']}")
        report.append(f"  Success Rate: {stats['success_rate']:.1f}%")
        report.append(f"  Avg Response Time: {stats['avg_response_time']:.3f}s")
        report.append(f"  Min Response Time: {stats['min_response_time']:.3f}s")
        report.append(f"  Max Response Time: {stats['max_response_time']:.3f}s")
        report.append(f"  Median Response Time: {stats['median_response_time']:.3f}s")
        report.append("")
    
    # Overall summary
    total_requests = sum(stats['total_requests'] for stats in results.values())
    total_success = sum(stats['success_count'] for stats in results.values())
    overall_success_rate = (total_success / total_requests) * 100 if total_requests > 0 else 0
    
    report.append("Overall Summary:")
    report.append(f"  Total Requests: {total_requests}")
    report.append(f"  Overall Success Rate: {overall_success_rate:.1f}%")
    report.append("")
    
    report_text = "\n".join(report)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(report_text)
        print(f"📊 Report saved to {output_file}")
    else:
        print(report_text)
    
    return report_text

def main():
    parser = argparse.ArgumentParser(description="GoldVision API Performance Test")
    parser.add_argument("--requests", type=int, default=50, help="Number of requests per endpoint")
    parser.add_argument("--output", type=str, help="Output file for the report")
    parser.add_argument("--url", type=str, default="http://127.0.0.1:8000", help="Base URL for the API")
    
    args = parser.parse_args()
    
    print(f"🔍 Testing API at {args.url}")
    
    # Run performance test
    results = run_performance_test(args.url, args.requests)
    
    # Generate report
    generate_report(results, args.output)
    
    print("✅ Performance test completed!")

if __name__ == "__main__":
    main()