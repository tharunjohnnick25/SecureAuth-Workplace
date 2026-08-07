'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/Card';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/Button';
import {
  Network,
  Server,
  Wifi,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import { useLanguage } from "@/context/LanguageContext";

const networkNodes = [
  { id: '1', name: 'Core Router', type: 'router', status: 'healthy', connections: 8, traffic: '2.4 Gbps' },
  { id: '2', name: 'Firewall-01', type: 'firewall', status: 'healthy', connections: 6, traffic: '1.8 Gbps' },
  { id: '3', name: 'Web Server Cluster', type: 'server', status: 'healthy', connections: 4, traffic: '890 Mbps' },
  { id: '4', name: 'Database Server', type: 'database', status: 'warning', connections: 3, traffic: '450 Mbps' },
  { id: '5', name: 'Load Balancer', type: 'loadbalancer', status: 'healthy', connections: 5, traffic: '1.2 Gbps' },
  { id: '6', name: 'VPN Gateway', type: 'vpn', status: 'healthy', connections: 12, traffic: '320 Mbps' },
  { id: '7', name: 'DMZ Switch', type: 'switch', status: 'healthy', connections: 7, traffic: '680 Mbps' },
  { id: '8', name: 'Unknown Device', type: 'unknown', status: 'critical', connections: 1, traffic: '15 Mbps' },
];

const networkStats = [
  { label: 'Total Devices', value: '147', icon: Network, color: 'primary' },
  { label: 'Healthy', value: '139', icon: CheckCircle, color: 'success' },
  { label: 'Warnings', value: '6', icon: AlertTriangle, color: 'warning' },
  { label: 'Critical', value: '2', icon: Shield, color: 'destructive' },
];

const networkSegments = [
  { name: 'Corporate Network', devices: 89, utilization: 45, status: 'healthy' },
  { name: 'DMZ', devices: 12, utilization: 72, status: 'warning' },
  { name: 'Data Center', devices: 28, utilization: 38, status: 'healthy' },
  { name: 'Guest Network', devices: 18, utilization: 15, status: 'healthy' },
];

const recentEvents = [
  { time: '14:35', event: 'New device connected to DMZ', severity: 'warning' },
  { time: '14:20', event: 'High bandwidth usage detected on Web Server Cluster', severity: 'info' },
  { time: '13:45', event: 'Unauthorized device blocked by Firewall-01', severity: 'critical' },
  { time: '13:15', event: 'VPN Gateway connection limit reached', severity: 'warning' },
];

export function NetworkMap() {
    const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Sidebar />
      <div className="lg:ml-64 transition-all duration-300">
        <Navbar />
        <main className="pt-24 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-2">{'Network topology'}</h1>
              <p className="text-muted-foreground">
                {'Visualize and monitor your network infrastructure'}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                {'Refresh'}</Button>
              <Button variant="outline">
                <Maximize2 className="w-4 h-4 mr-2" />
                {'Full screen'}</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {networkStats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg bg-${stat.color}/20 flex items-center justify-center`}>
                    <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <h3 className="text-2xl font-semibold">{stat.value}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                {'Network topology'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-input-background/30 rounded-lg p-8 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <Network className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">
                    {'Interactive network map'}</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {'Showing'}{networkNodes.length} {'network nodes with status'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{'Network devices'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {networkNodes.map((node) => (
                    <div
                      key={node.id}
                      className="p-4 rounded-lg bg-input-background/30 hover:bg-input-background/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            node.status === 'healthy' ? 'bg-success/20' :
                            node.status === 'warning' ? 'bg-warning/20' :
                            'bg-destructive/20'
                          }`}>
                            <Server className={`w-5 h-5 ${
                              node.status === 'healthy' ? 'text-success' :
                              node.status === 'warning' ? 'text-warning' :
                              'text-destructive'
                            }`} />
                          </div>
                          <div>
                            <h4 className="font-medium mb-1">{node.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{node.type}</span>
                              <span>•</span>
                              <span>{node.connections} {'Connections'}</span>
                              <span>•</span>
                              <span>{node.traffic}</span>
                            </div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          node.status === 'healthy' ? 'bg-success/20 text-success' :
                          node.status === 'warning' ? 'bg-warning/20 text-warning' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {node.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{'Network segments'}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {networkSegments.map((segment, index) => (
                    <div key={index} className="p-3 rounded-lg bg-input-background/30">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{segment.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          segment.status === 'healthy' ? 'bg-success/20 text-success' :
                          'bg-warning/20 text-warning'
                        }`}>
                          {segment.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>{'Devices'}</span>
                          <span className="text-foreground font-medium">{segment.devices}</span>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span>{'Utilization'}</span>
                            <span className="text-foreground font-medium">{segment.utilization}%</span>
                          </div>
                          <div className="w-full bg-input-background rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                segment.utilization > 70 ? 'bg-warning' :
                                segment.utilization > 50 ? 'bg-primary' :
                                'bg-success'
                              }`}
                              style={{ width: `${segment.utilization}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{'Recent network events'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentEvents.map((event, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-input-background/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.severity === 'critical' ? 'bg-destructive' :
                        event.severity === 'warning' ? 'bg-warning' :
                        'bg-primary'
                      }`} />
                      <p className="text-sm">{event.event}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{event.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
