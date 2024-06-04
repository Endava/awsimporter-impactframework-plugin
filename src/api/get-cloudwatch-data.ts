import {PluginParams} from '../interfaces';
import {AWSCredentials, Ec2Machine, YourGlobalConfig} from '../types';
import {
  convertSecondsToMS,
  getFinalGroupedItems,
  getInstanceTypes,
} from '../utils/utils';
import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
  GetMetricStatisticsCommandInput,
  ListMetricsOutput,
  // eslint-disable-next-line node/no-extraneous-import
} from '@aws-sdk/client-cloudwatch';
import {getCloudwatchMetrics} from './get-cloudwatch-metrics';
import {METRICS_CONFIG} from '../constants/constants';

export const getCloudWatchData = async (
  input: PluginParams,
  globalConfig: YourGlobalConfig,
  instances: Ec2Machine[],
  region: string,
  credentials: AWSCredentials
) => {
  const {timestamp, duration}: PluginParams = {
    ...input,
    duration: convertSecondsToMS(input.duration),
  };

  const cloudWatch = new CloudWatchClient({
    region,
    credentials,
  });

  // Fetches a list of CloudWatch metrics for each EC2 instance based on the CloudWatch namespace defined in the global configuration.
  const listMetricsCloudWatch = await Promise.all(
    getCloudwatchMetrics(
      instances,
      cloudWatch,
      globalConfig.metric['cloudwatch-namespace']
    )
  );
  // Fetches a list of CloudWatch metrics for each EC2 instance based on the client namespace defined in the global configuration.
  const listMetricsEc2 = await Promise.all(
    getCloudwatchMetrics(
      instances,
      cloudWatch,
      globalConfig.metric['client-namespace']
    )
  );
  // Generates an array of GetMetricStatisticsCommandInput objects for a specific metric type
  // (e.g., total memory or CPU utilization) from the list of metrics fetched.
  function combineCommands(
    metricType: string,
    list: ListMetricsOutput[]
  ): GetMetricStatisticsCommandInput[] {
    const commands: GetMetricStatisticsCommandInput[] = [];

    list.forEach(instance => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      instance.Metrics.forEach(metric => {
        if (metric.MetricName === metricType) {
          commands.push({
            Dimensions: metric.Dimensions,
            MetricName: metric.MetricName,
            Namespace: metric.Namespace,
            Period: globalConfig['aws-importer']['aws-observation'],
            Unit: metricType.includes('mem') ? 'Bytes' : 'Percent',
            Statistics: ['Average'],
            StartTime: new Date(timestamp),
            EndTime: new Date(new Date(timestamp).getTime() + duration),
          });
        }
      });
    });

    return commands;
  }

  const getTotalMemoryCommands: GetMetricStatisticsCommandInput[] =
    combineCommands(METRICS_CONFIG.MEM_TOTAL, listMetricsCloudWatch);
  const getCpuUsageCommands: GetMetricStatisticsCommandInput[] =
    combineCommands(METRICS_CONFIG.CPU_UTILIZATION_EC2, listMetricsEc2);

  // Creates an array of promises to fetch total memory usage statistics for each command prepared earlier.
  const totalMemoryPromises = getTotalMemoryCommands.map(command =>
    cloudWatch.send(new GetMetricStatisticsCommand(command))
  );
  // Creates an array of promises to fetch CPU usage statistics for each command prepared earlier.
  const cpuUsagePromises = getCpuUsageCommands.map(command =>
    cloudWatch.send(new GetMetricStatisticsCommand(command))
  );
  // Awaits the resolution of all promises for fetching total memory and CPU usage statistics, effectively waiting for all CloudWatch data to be fetched.
  const metricDataPromises = await Promise.all([
    totalMemoryPromises,
    cpuUsagePromises,
  ]);

  const resolvedMetricData: any = await Promise.all(
    metricDataPromises.map(innerPromises => Promise.all(innerPromises))
  );

  // It creates the groups with the received data
  const groupedItemsArray = getFinalGroupedItems(resolvedMetricData);
  const instanceTypes: unknown[] = getInstanceTypes(listMetricsCloudWatch);

  return {groupedItemsArray, instanceTypes};
};
