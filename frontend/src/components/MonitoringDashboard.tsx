import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Server,
  Database,
  Activity,
  Users,
  TrendingUp,
  Newspaper,
} from "lucide-react";

interface SystemMetrics {
  status: string;
  timestamp: string;
  system: {
    uptime: number;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
    };
    cpu: {
      user: number;
      system: number;
    };
  };
  database: {
    users: number;
    prices: number;
    news: number;
  };
  recent: {
    prices: any[];
    news: any[];
  };
}

const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/monitoring/system");
      if (!response.ok) {
        throw new Error("Failed to fetch metrics");
      }
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading system metrics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Error: {error}</p>
        <Button onClick={fetchMetrics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <div className="flex items-center space-x-2">
          <Badge variant={metrics?.status === "ok" ? "default" : "destructive"}>
            {metrics?.status === "ok" ? "Healthy" : "Unhealthy"}
          </Badge>
          <Button onClick={fetchMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatUptime(metrics?.system.uptime || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Last updated: {formatTimestamp(metrics?.timestamp || "")}
            </p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.system.memory.heapUsed}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {metrics?.system.memory.heapTotal}
            </p>
          </CardContent>
        </Card>

        {/* Database Stats */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Users:</span>
                <span className="font-medium">{metrics?.database.users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Prices:</span>
                <span className="font-medium">{metrics?.database.prices}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">News:</span>
                <span className="font-medium">{metrics?.database.news}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm">Latest Price:</span>
                <span className="font-medium">
                  ${metrics?.recent.prices[0]?.y?.toFixed(2) || "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Latest News:</span>
                <span className="font-medium">
                  {metrics?.recent.news.length || 0} articles
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Prices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics?.recent.prices.map((price, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <span className="text-sm">
                    {new Date(price.ds).toLocaleDateString()}
                  </span>
                  <span className="font-medium">${price.y?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent News */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Newspaper className="h-5 w-5 mr-2" />
              Recent News
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics?.recent.news.map((article, index) => (
                <div key={index} className="p-2 bg-muted rounded">
                  <h4 className="font-medium text-sm line-clamp-2">
                    {article.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
