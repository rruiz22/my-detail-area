#!/usr/bin/env node

/**
 * Performance Test Runner Script
 *
 * Comprehensive test runner for validating all modal system optimizations.
 * Generates detailed performance reports and benchmark comparisons.
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  description: string;
  command: string;
  timeout: number;
  expectedImprovement: number; // Percentage improvement expected
}

interface PerformanceResults {
  suite: string;
  passed: boolean;
  duration: number;
  metrics: Record<string, any>;
  timestamp: string;
}

class PerformanceTestRunner {
  private results: PerformanceResults[] = [];
  private outputDir: string;

  constructor() {
    this.outputDir = join(process.cwd(), 'test-results', 'performance');
    this.ensureOutputDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m'    // Red
    };

    const reset = '\x1b[0m';
    const timestamp = new Date().toISOString();

    console.log(`${colors[level]}[${timestamp}] ${message}${reset}`);
  }

  private async runTestSuite(suite: TestSuite): Promise<PerformanceResults> {
    this.log(`Running ${suite.name}: ${suite.description}`, 'info');

    const startTime = Date.now();
    let passed = false;
    let metrics = {};

    try {
      const output = execSync(suite.command, {
        cwd: process.cwd(),
        timeout: suite.timeout,
        encoding: 'utf-8',
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PERFORMANCE_TESTING: 'true',
          PERFORMANCE_LOGGING: 'true'
        }
      });

      // Parse output for performance metrics
      metrics = this.parseTestOutput(output);
      passed = true;

      this.log(`✅ ${suite.name} completed successfully`, 'success');

    } catch (error: any) {
      this.log(`❌ ${suite.name} failed: ${error.message}`, 'error');

      // Try to extract metrics even from failed tests
      if (error.stdout) {
        metrics = this.parseTestOutput(error.stdout);
      }
    }

    const duration = Date.now() - startTime;

    const result: PerformanceResults = {
      suite: suite.name,
      passed,
      duration,
      metrics,
      timestamp: new Date().toISOString()
    };

    this.results.push(result);
    return result;
  }

  private parseTestOutput(output: string): Record<string, any> {
    const metrics: Record<string, any> = {};

    try {
      // Extract performance metrics from console output
      const lines = output.split('\n');

      lines.forEach(line => {
        // Parse benchmark results
        if (line.includes('📊 BENCHMARK:')) {
          const match = line.match(/📊 BENCHMARK: (.+) - ([\d.]+)ms/);
          if (match) {
            metrics[`benchmark_${match[1].replace(/\s+/g, '_')}`] = parseFloat(match[2]);
          }
        }

        // Parse memory usage
        if (line.includes('💾 MEMORY:')) {
          const match = line.match(/💾 MEMORY: (.+) - ([\d.]+)MB/);
          if (match) {
            metrics[`memory_${match[1].replace(/\s+/g, '_')}`] = parseFloat(match[2]);
          }
        }

        // Parse performance results
        if (line.includes('🚀 PERFORMANCE:')) {
          const match = line.match(/🚀 PERFORMANCE: (.+)/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              Object.assign(metrics, data);
            } catch {
              // Ignore JSON parse errors
            }
          }
        }

        // Parse cache statistics
        if (line.includes('📦 Cache Performance:')) {
          const nextLines = lines.slice(lines.indexOf(line) + 1, lines.indexOf(line) + 5);
          nextLines.forEach(nextLine => {
            const cacheMatch = nextLine.match(/(.+): ([\d.]+)%?/);
            if (cacheMatch) {
              const key = `cache_${cacheMatch[1].trim().replace(/\s+/g, '_').toLowerCase()}`;
              metrics[key] = parseFloat(cacheMatch[2]);
            }
          });
        }
      });

    } catch (error) {
      this.log(`Warning: Could not parse test output for metrics: ${error}`, 'warning');
    }

    return metrics;
  }

  private generateReport(): void {
    const reportData = {
      testRun: {
        timestamp: new Date().toISOString(),
        totalSuites: this.results.length,
        passedSuites: this.results.filter(r => r.passed).length,
        failedSuites: this.results.filter(r => !r.passed).length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      results: this.results,
      summary: this.generateSummary(),
      recommendations: this.generateRecommendations()
    };

    // Write JSON report
    const jsonReportPath = join(this.outputDir, 'performance-report.json');
    writeFileSync(jsonReportPath, JSON.stringify(reportData, null, 2));

    // Write HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlReportPath = join(this.outputDir, 'performance-report.html');
    writeFileSync(htmlReportPath, htmlReport);

    // Write console summary
    this.printSummary(reportData);

    this.log(`📊 Performance reports generated:`, 'success');
    this.log(`   JSON: ${jsonReportPath}`, 'info');
    this.log(`   HTML: ${htmlReportPath}`, 'info');
  }

  private generateSummary(): Record<string, any> {
    const summary: Record<string, any> = {
      performance_improvements: {},
      critical_metrics: {},
      regression_checks: {}
    };

    // Analyze performance improvements
    this.results.forEach(result => {
      if (result.metrics.benchmark_modal_load_time) {
        const loadTime = result.metrics.benchmark_modal_load_time;
        const legacyTime = 30000; // 30 seconds legacy baseline
        const improvement = ((legacyTime - loadTime) / legacyTime) * 100;

        summary.performance_improvements[result.suite] = {
          load_time_improvement: `${improvement.toFixed(1)}%`,
          current_load_time: `${loadTime.toFixed(2)}ms`,
          legacy_load_time: `${legacyTime}ms`
        };
      }

      // Cache performance
      if (result.metrics.cache_hit_rate !== undefined) {
        summary.critical_metrics.cache_performance = {
          hit_rate: `${(result.metrics.cache_hit_rate * 100).toFixed(1)}%`,
          target: '85%',
          status: result.metrics.cache_hit_rate >= 0.85 ? 'PASS' : 'FAIL'
        };
      }

      // Memory usage
      if (result.metrics.memory_growth !== undefined) {
        const memoryMB = result.metrics.memory_growth / 1024 / 1024;
        summary.critical_metrics.memory_usage = {
          growth: `${memoryMB.toFixed(2)}MB`,
          target: '5MB',
          status: memoryMB <= 5 ? 'PASS' : 'FAIL'
        };
      }
    });

    return summary;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyze results for recommendations
    this.results.forEach(result => {
      if (!result.passed) {
        recommendations.push(`🔧 Fix failing test suite: ${result.suite}`);
      }

      if (result.metrics.benchmark_modal_load_time > 2000) {
        recommendations.push(`⚡ Optimize modal load time in ${result.suite} (current: ${result.metrics.benchmark_modal_load_time}ms)`);
      }

      if (result.metrics.cache_hit_rate < 0.85) {
        recommendations.push(`📦 Improve cache hit rate in ${result.suite} (current: ${(result.metrics.cache_hit_rate * 100).toFixed(1)}%)`);
      }

      if (result.metrics.memory_growth > 5 * 1024 * 1024) {
        recommendations.push(`💾 Address memory usage in ${result.suite} (growth: ${(result.metrics.memory_growth / 1024 / 1024).toFixed(2)}MB)`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('🎉 All performance targets met! System is optimally performing.');
    }

    return recommendations;
  }

  private generateHTMLReport(data: any): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Modal Performance Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .chart-placeholder { background: #e9ecef; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #6c757d; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .status-pass { color: #28a745; font-weight: bold; }
        .status-fail { color: #dc3545; font-weight: bold; }
        .improvement { font-size: 1.2em; font-weight: bold; color: #28a745; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Order Modal Performance Report</h1>
            <p>Comprehensive analysis of system optimizations and performance improvements</p>
            <p><strong>Generated:</strong> ${data.testRun.timestamp}</p>
        </div>

        <div class="metric-card ${data.testRun.failedSuites === 0 ? 'success' : 'warning'}">
            <h3>📊 Test Run Summary</h3>
            <div class="metrics-grid">
                <div>
                    <strong>Total Test Suites:</strong> ${data.testRun.totalSuites}<br>
                    <strong>Passed:</strong> <span class="status-pass">${data.testRun.passedSuites}</span><br>
                    <strong>Failed:</strong> <span class="status-fail">${data.testRun.failedSuites}</span>
                </div>
                <div>
                    <strong>Total Duration:</strong> ${(data.testRun.totalDuration / 1000).toFixed(2)}s<br>
                    <strong>Average per Suite:</strong> ${(data.testRun.totalDuration / data.testRun.totalSuites / 1000).toFixed(2)}s
                </div>
            </div>
        </div>

        <div class="metric-card success">
            <h3>🎯 Performance Improvements</h3>
            ${Object.entries(data.summary.performance_improvements || {}).map(([suite, metrics]: [string, any]) => `
                <div style="margin: 10px 0;">
                    <strong>${suite}:</strong>
                    <span class="improvement">${metrics.load_time_improvement} faster</span>
                    (${metrics.current_load_time} vs ${metrics.legacy_load_time})
                </div>
            `).join('')}
        </div>

        <div class="metric-card">
            <h3>📈 Critical Metrics</h3>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Current Value</th>
                        <th>Target</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(data.summary.critical_metrics || {}).map(([metric, data]: [string, any]) => `
                        <tr>
                            <td>${metric.replace(/_/g, ' ').toUpperCase()}</td>
                            <td>${data.current || data.growth || data.hit_rate || 'N/A'}</td>
                            <td>${data.target}</td>
                            <td class="status-${data.status === 'PASS' ? 'pass' : 'fail'}">${data.status}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="metric-card">
            <h3>🔧 Recommendations</h3>
            <ul>
                ${data.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="metric-card">
            <h3>📋 Detailed Results</h3>
            <table>
                <thead>
                    <tr>
                        <th>Test Suite</th>
                        <th>Status</th>
                        <th>Duration (s)</th>
                        <th>Key Metrics</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.results.map((result: PerformanceResults) => `
                        <tr>
                            <td>${result.suite}</td>
                            <td class="status-${result.passed ? 'pass' : 'fail'}">${result.passed ? 'PASS' : 'FAIL'}</td>
                            <td>${(result.duration / 1000).toFixed(2)}</td>
                            <td>${Object.keys(result.metrics).length} metrics collected</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
    `.trim();
  }

  private printSummary(data: any): void {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('🚀 PERFORMANCE TEST SUMMARY', 'success');
    this.log('='.repeat(60), 'info');

    this.log(`📊 Test Results: ${data.testRun.passedSuites}/${data.testRun.totalSuites} passed`, 'info');

    if (data.summary.performance_improvements) {
      this.log('\n🎯 Key Performance Improvements:', 'success');
      Object.entries(data.summary.performance_improvements).forEach(([suite, metrics]: [string, any]) => {
        this.log(`   ${suite}: ${metrics.load_time_improvement} faster`, 'success');
      });
    }

    if (data.summary.critical_metrics) {
      this.log('\n📈 Critical Metrics Status:', 'info');
      Object.entries(data.summary.critical_metrics).forEach(([metric, data]: [string, any]) => {
        const status = data.status === 'PASS' ? '✅' : '❌';
        this.log(`   ${metric}: ${status} ${data.current || data.growth || data.hit_rate}`, 'info');
      });
    }

    if (data.recommendations.length > 0) {
      this.log('\n🔧 Recommendations:', 'warning');
      data.recommendations.forEach((rec: string) => {
        this.log(`   ${rec}`, 'warning');
      });
    }

    this.log('\n' + '='.repeat(60), 'info');
  }

  async run(): Promise<void> {
    this.log('🚀 Starting comprehensive performance test suite', 'info');

    const testSuites: TestSuite[] = [
      {
        name: 'Performance Tests',
        description: 'Core modal performance validation',
        command: 'npm run test:performance',
        timeout: 60000,
        expectedImprovement: 95 // 95% improvement expected
      },
      {
        name: 'Integration Tests',
        description: 'Data fetching and caching integration',
        command: 'npm run test:integration',
        timeout: 45000,
        expectedImprovement: 80
      },
      {
        name: 'Unit Tests',
        description: 'Component optimization validation',
        command: 'npm run test:unit',
        timeout: 30000,
        expectedImprovement: 70
      },
      {
        name: 'E2E Performance',
        description: 'End-to-end performance validation',
        command: 'npm run test:e2e:performance',
        timeout: 120000,
        expectedImprovement: 90
      },
      {
        name: 'Benchmark Comparison',
        description: 'Legacy vs optimized system comparison',
        command: 'npm run test:benchmark',
        timeout: 60000,
        expectedImprovement: 95
      }
    ];

    // Run all test suites
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate comprehensive report
    this.generateReport();

    // Exit with appropriate code
    const allPassed = this.results.every(r => r.passed);
    if (allPassed) {
      this.log('🎉 All performance tests passed!', 'success');
      process.exit(0);
    } else {
      this.log('❌ Some performance tests failed', 'error');
      process.exit(1);
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const runner = new PerformanceTestRunner();
  runner.run().catch(error => {
    console.error('❌ Performance test runner failed:', error);
    process.exit(1);
  });
}

export { PerformanceTestRunner };