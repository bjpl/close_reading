/**
 * Cost Dashboard Component
 * Visualize API usage and costs
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Separator,
  Button,
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { Progress } from '@chakra-ui/react/progress';
import { Stat } from '@chakra-ui/react/stat';
import { Alert } from '@chakra-ui/react/alert';
import type { CostTracker, UsageStats, BudgetAlert } from '../../services/ai';
import { logger } from '../../utils/logger';

interface CostDashboardProps {
  costTracker: CostTracker;
}

export const CostDashboard: React.FC<CostDashboardProps> = ({ costTracker }) => {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [monthStats, setMonthStats] = useState<UsageStats | null>(null);
  const [todayStats, setTodayStats] = useState<UsageStats | null>(null);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [remainingBudget, setRemainingBudget] = useState<number>(0);
  const [projectedSpend, setProjectedSpend] = useState<number>(0);

  useEffect(() => {
    loadStats();

    // Add listener for real-time updates
    const listener = (newStats: UsageStats) => {
      setStats(newStats);
    };
    costTracker.addListener(listener);

    return () => {
      costTracker.removeListener(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costTracker]);

  const loadStats = async () => {
    try {
      const [all, month, today, budgetAlerts, remaining, projected] =
        await Promise.all([
          costTracker.getStats(),
          costTracker.getCurrentMonthStats(),
          costTracker.getTodayStats(),
          costTracker.checkBudgetAlerts(),
          costTracker.getRemainingBudget(),
          costTracker.getProjectedMonthlySpend(),
        ]);

      setStats(all);
      setMonthStats(month);
      setTodayStats(today);
      setAlerts(budgetAlerts);
      setRemainingBudget(remaining);
      setProjectedSpend(projected);
    } catch (error) {
      logger.error({ error }, 'Error loading cost stats');
    }
  };

  const exportReport = async () => {
    const report = await costTracker.exportUsageReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usage-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!monthStats) {
    return (
      <Box p={4}>
        <Text>Loading statistics...</Text>
      </Box>
    );
  }

  const budgetUtilization =
    (monthStats.totalCost / (remainingBudget + monthStats.totalCost)) * 100;

  return (
    <Box p={4} borderWidth={1} borderRadius="lg">
      <VStack align="stretch" gap={4}>
        <HStack justify="space-between">
          <Text fontSize="xl" fontWeight="bold">
            Usage Dashboard
          </Text>
          <Button size="sm" onClick={exportReport}>
            Export Report
          </Button>
        </HStack>

        {/* Budget Alerts */}
        {alerts.length > 0 && (
          <VStack align="stretch" gap={2}>
            {alerts.map((alert, idx) => (
              <Alert.Root
                key={idx}
                status={alert.severity === 'critical' ? 'error' : 'warning'}
              >
                <Alert.Indicator />
                <Box flex="1">
                  <Alert.Title>{alert.type.replace(/-/g, ' ')}</Alert.Title>
                  <Alert.Description>{alert.message}</Alert.Description>
                </Box>
              </Alert.Root>
            ))}
          </VStack>
        )}

        {/* Monthly Overview */}
        <Box p={4} bg="blue.50" borderRadius="md">
          <VStack align="stretch" gap={3}>
            <Text fontSize="lg" fontWeight="semibold">
              Current Month
            </Text>

            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              <GridItem>
                <Stat.Root>
                  <Stat.Label>Total Cost</Stat.Label>
                  <Stat.ValueText>${monthStats.totalCost.toFixed(2)}</Stat.ValueText>
                  <Stat.HelpText>
                    {monthStats.totalRequests} requests
                  </Stat.HelpText>
                </Stat.Root>
              </GridItem>

              <GridItem>
                <Stat.Root>
                  <Stat.Label>Remaining Budget</Stat.Label>
                  <Stat.ValueText>${remainingBudget.toFixed(2)}</Stat.ValueText>
                  <Stat.HelpText>
                    {budgetUtilization.toFixed(1)}% used
                  </Stat.HelpText>
                </Stat.Root>
              </GridItem>

              <GridItem>
                <Stat.Root>
                  <Stat.Label>Projected</Stat.Label>
                  <Stat.ValueText>${projectedSpend.toFixed(2)}</Stat.ValueText>
                  <Stat.HelpText>
                    End of month
                  </Stat.HelpText>
                </Stat.Root>
              </GridItem>
            </Grid>

            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm">Budget Utilization</Text>
                <Text fontSize="sm" fontWeight="semibold">
                  {budgetUtilization.toFixed(1)}%
                </Text>
              </HStack>
              <Progress.Root
                value={budgetUtilization}
                colorPalette={
                  budgetUtilization > 90
                    ? 'red'
                    : budgetUtilization > 75
                      ? 'orange'
                      : 'green'
                }
                borderRadius="full"
              >
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          </VStack>
        </Box>

        {/* Today's Stats */}
        {todayStats && (
          <Box p={4} bg="green.50" borderRadius="md">
            <VStack align="stretch" gap={2}>
              <Text fontSize="lg" fontWeight="semibold">
                Today
              </Text>
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <GridItem>
                  <Stat.Root>
                    <Stat.Label>Cost</Stat.Label>
                    <Stat.ValueText>${todayStats.totalCost.toFixed(2)}</Stat.ValueText>
                  </Stat.Root>
                </GridItem>
                <GridItem>
                  <Stat.Root>
                    <Stat.Label>Requests</Stat.Label>
                    <Stat.ValueText>{todayStats.totalRequests}</Stat.ValueText>
                  </Stat.Root>
                </GridItem>
                <GridItem>
                  <Stat.Root>
                    <Stat.Label>Tokens</Stat.Label>
                    <Stat.ValueText>
                      {(todayStats.totalTokens / 1000).toFixed(1)}K
                    </Stat.ValueText>
                  </Stat.Root>
                </GridItem>
              </Grid>
            </VStack>
          </Box>
        )}

        <Separator />

        {/* Feature Breakdown */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={3}>
            Usage by Feature
          </Text>
          <VStack align="stretch" gap={2}>
            {Object.entries(monthStats.byFeature)
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([feature, usage]) => {
                const percentage =
                  (usage.cost / monthStats.totalCost) * 100;
                return (
                  <Box key={feature}>
                    <HStack justify="space-between" mb={1}>
                      <HStack>
                        <Text fontSize="sm" fontWeight="medium">
                          {feature}
                        </Text>
                        <Badge>{usage.requests} requests</Badge>
                      </HStack>
                      <Text fontSize="sm" fontWeight="semibold">
                        ${usage.cost.toFixed(2)} ({percentage.toFixed(1)}%)
                      </Text>
                    </HStack>
                    <Progress.Root
                      value={percentage}
                      size="sm"
                      colorPalette="blue"
                      borderRadius="full"
                    >
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                  </Box>
                );
              })}
          </VStack>
        </Box>

        {/* Daily Trend */}
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={3}>
            Daily Spending (Last 7 Days)
          </Text>
          <VStack align="stretch" gap={1}>
            {Object.entries(monthStats.byDay)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 7)
              .map(([date, usage]) => (
                <HStack key={date} justify="space-between">
                  <Text fontSize="sm">{date}</Text>
                  <HStack>
                    <Badge>{usage.requests} req</Badge>
                    <Text fontSize="sm" fontWeight="semibold">
                      ${usage.cost.toFixed(2)}
                    </Text>
                  </HStack>
                </HStack>
              ))}
          </VStack>
        </Box>

        {/* All-Time Stats */}
        {stats && (
          <Box p={4} bg="gray.50" borderRadius="md">
            <Text fontSize="lg" fontWeight="semibold" mb={3}>
              All-Time Statistics
            </Text>
            <Grid templateColumns="repeat(3, 1fr)" gap={4}>
              <GridItem>
                <Stat.Root>
                  <Stat.Label>Total Cost</Stat.Label>
                  <Stat.ValueText>${stats.totalCost.toFixed(2)}</Stat.ValueText>
                </Stat.Root>
              </GridItem>
              <GridItem>
                <Stat.Root>
                  <Stat.Label>Total Requests</Stat.Label>
                  <Stat.ValueText>{stats.totalRequests}</Stat.ValueText>
                </Stat.Root>
              </GridItem>
              <GridItem>
                <Stat.Root>
                  <Stat.Label>Total Tokens</Stat.Label>
                  <Stat.ValueText>
                    {(stats.totalTokens / 1_000_000).toFixed(2)}M
                  </Stat.ValueText>
                </Stat.Root>
              </GridItem>
            </Grid>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default CostDashboard;
