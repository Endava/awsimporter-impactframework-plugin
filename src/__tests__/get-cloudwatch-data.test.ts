// eslint-disable-next-line node/no-extraneous-import
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { getCloudwatchMetrics } from '../api/get-cloudwatch-metrics';
import { getCloudWatchData } from '../api/get-cloudwatch-data';
import {
  convertSecondsToMS,
  getFinalGroupedItems,
  getInstanceTypes,
} from '../utils/utils';
import { PluginParams } from '../interfaces';
import { mockGlobalConfig, mockInstances } from '../__mocks__';
import { AWSCredentials } from '../types';
import { METRICS_CONFIG } from '../constants/constants';

// Mock the dependencies
jest.mock('@aws-sdk/client-cloudwatch', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-cloudwatch');
  return {
    ...originalModule,
    CloudWatchClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        Datapoints: [
          { Average: 50, Timestamp: new Date().toISOString() },
        ],
      }),
    })),
  };
});

jest.mock('../utils/utils', () => ({
  convertSecondsToMS: jest.fn(),
  getFinalGroupedItems: jest.fn(),
  getInstanceTypes: jest.fn(),
}));

// Mock getCloudwatchMetrics to return an array of promises
jest.mock('../api/get-cloudwatch-metrics', () => ({
  getCloudwatchMetrics: jest.fn().mockImplementation(() => {
    const promises = mockInstances.map(instance => {
      return Promise.resolve({
        Metrics: [
          {
            MetricName: 'MemoryUsage',
            Dimensions: [{ Name: 'InstanceId', Value: instance.InstanceId }],
            Namespace: 'AWS/EC2',
          },
        ],
      });
    });
    return promises;
  }),
}));

describe('getCloudWatchData', () => {
  const mockInput: PluginParams = {
    timestamp: new Date().toISOString(),
    duration: 3600,
  };

  const mockRegion = 'us-east-1';

  const mockCredentials: AWSCredentials = {
    accessKeyId: 'mockAccessKey',
    secretAccessKey: 'mockSecretKey',
  };

  const expectedGroupedItems = [
    { [METRICS_CONFIG.MEM_UTILIZATION]: 50, [METRICS_CONFIG.CPU_UTILIZATION]: 50 },
  ];

  const expectedInstanceTypes = ['t2.micro', 't2.medium'];

  beforeEach(() => {
    jest.clearAllMocks();
    (convertSecondsToMS as jest.Mock).mockReturnValue(300000); // Assuming duration in milliseconds
    (getFinalGroupedItems as jest.Mock).mockReturnValue(expectedGroupedItems);
    (getInstanceTypes as jest.Mock).mockReturnValue(expectedInstanceTypes);
  });

  it('fetches CloudWatch data and processes it correctly', async () => {
    const result = await getCloudWatchData(
      mockInput,
      mockGlobalConfig,
      mockInstances,
      mockRegion,
      mockCredentials
    );

    expect(result).toEqual({
      groupedItemsArray: expectedGroupedItems,
      instanceTypes: expectedInstanceTypes,
    });

    expect(convertSecondsToMS).toHaveBeenCalledWith(mockInput.duration);
    expect(getFinalGroupedItems).toHaveBeenCalledWith(expect.any(Array));
    expect(getInstanceTypes).toHaveBeenCalledWith(expect.any(Array));
  });
});
