// eslint-disable-next-line node/no-extraneous-import
import {CloudWatchClient} from '@aws-sdk/client-cloudwatch';
import {getCloudwatchMetrics} from '../api/get-cloudwatch-metrics';
import {mockInstances} from '../__mocks__';

// Mock the CloudWatchClient from AWS SDK
jest.mock('@aws-sdk/client-cloudwatch', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-cloudwatch');
  return {
    ...originalModule,
    CloudWatchClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          Metrics: [
            {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [{Name: 'InstanceId', Value: 'i-1234567890abcdef0'}],
            },
          ],
        });
      }),
    })),
  };
});

describe('getCloudwatchMetrics', () => {
  it('retrieves metrics for each EC2 instance', async () => {
    const namespace = 'AWS/EC2';
    const cloudWatch = new CloudWatchClient({region: 'eu-central-1'});

    const metricsPromises = getCloudwatchMetrics(
      mockInstances,
      cloudWatch,
      namespace
    );
    const metrics = await Promise.all(metricsPromises);

    expect(metrics).toHaveLength(mockInstances.length);
    metrics.forEach((metricResult, index) => {
      expect(metricResult.Metrics).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      expect(metricResult.Metrics[0].Dimensions[0].Value).toEqual(
        mockInstances[index].InstanceId
      );
    });
  });
});
