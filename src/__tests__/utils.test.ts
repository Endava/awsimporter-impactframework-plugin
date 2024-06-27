import { METRICS_CONFIG } from '../constants/constants';
import { mockAllCloudWatchData, mockDiskData, mockInstances, mockInstancesEmptyBlockDevices, mockInstancesNotDefiniedBlockDevices } from '../__mocks__';
import { AWSRegion, DataItem, Datapoint, Ec2Machine } from '../types';
import {
  getFinalData,
  getVolumeIds,
  getGeolocation,
  getFinalGroupedItems,
  calculateAverage,
  convertBytesToGB,
  convertSecondsToMS,
  getInstanceTypes,
  groupItems,
  groupItemsByKeys,
  getMetricAverages,
} from '../utils/utils';
import { DescribeInstancesCommandInput } from '@aws-sdk/client-ec2';

jest.mock('@aws-sdk/client-ec2', () => {
  const originalModule = jest.requireActual('@aws-sdk/client-ec2');
  return {
    ...originalModule,
    EC2Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockImplementation((command: { input: DescribeInstancesCommandInput }) => {
        const tagFilter = command.input.Filters?.find((filter) => filter.Name === 'tag:Project');
        const tagValue = tagFilter?.Values?.[0] ?? '';

        if (tagValue === 'no-defined-block-devices') {
          return Promise.resolve({
            Reservations: [{
              Instances: [{
                InstanceId: 'i-1234567890abcdef0',
                ImageId: 'ami-05d72852800cbf29e',
                InstanceType: 't2.micro',
                RootDeviceName: '/dev/sda1',
                BlockDevices: [],
              }],
            }],
          });
        } else if (tagValue === 'no-block-devices') {
          return Promise.resolve({
            Reservations: [{
              Instances: [{
                InstanceId: 'i-1234567890abcdef0',
                ImageId: 'ami-05d72852800cbf29e',
                InstanceType: 't2.micro',
                RootDeviceName: '/dev/sda1',
                BlockDevices: undefined,
              }],
            }],
          });
        }
        return Promise.resolve({
          Reservations: [{
            Instances: [{
              InstanceId: 'i-1234567890abcdef0',
              ImageId: 'ami-05d72852800cbf29e',
              InstanceType: 't2.micro',
              RootDeviceName: '/dev/sda1',
              BlockDevices: [{
                DeviceName: '/dev/sda1',
                Ebs: { VolumeId: 'vol-01c4a06424ff37c90' },
              }],
            }],
          }],
        });
      }),
    })),
  };
});

describe('utils', () => {
  describe('getFinalData', () => {
    it('should return final data correctly when both ec2 and ebs services are included', () => {
      const servicesArray = ['ec2', 'ebs'];
      const finalData = getFinalData(servicesArray, mockAllCloudWatchData, mockDiskData);

      expect(finalData).toEqual([...mockAllCloudWatchData, ...mockDiskData]);
    });

    it('should return only ec2 data when only ec2 service is included', () => {
      const servicesArray = ['ec2'];
      const finalData = getFinalData(servicesArray, mockAllCloudWatchData, mockDiskData);

      expect(finalData).toEqual(mockAllCloudWatchData);
    });

    it('should return only ebs data when only ebs service is included', () => {
      const servicesArray = ['ebs'];
      const finalData = getFinalData(servicesArray, mockAllCloudWatchData, mockDiskData);

      expect(finalData).toEqual(mockDiskData);
    });

    it('should return empty array when no services are included', () => {
      const servicesArray: string[] = [];
      const finalData = getFinalData(servicesArray, mockAllCloudWatchData, mockDiskData);

      expect(finalData).toEqual([]);
    });
  });

  describe('getVolumeIds', () => {
    it('should return volume IDs correctly when machines have block devices', () => {
      const volumeIds = getVolumeIds(mockInstances);
      expect(volumeIds).toEqual(['vol-1234567890abcdef0']);
    });

    it('should return empty array when machines have no block devices', () => {
      const volumeIds = getVolumeIds(mockInstancesEmptyBlockDevices);
      expect(volumeIds).toEqual([]);
    });

    it('should return empty array when machines block devices are not defined', () => {
      const volumeIds = getVolumeIds(mockInstancesNotDefiniedBlockDevices);
      expect(volumeIds).toEqual([]);
    });

    it('should return empty array when input is undefined', () => {
      const volumeIds = getVolumeIds(undefined);
      expect(volumeIds).toEqual([]);
    });
  });

  describe('getGeolocation', () => {
    it('should return correct geolocation for known regions', () => {
      expect(getGeolocation('us-east-2')).toBe('40.3375813,-85.3089691');
      expect(getGeolocation('us-east-1')).toBe('38.8809212,-77.1845565');
      expect(getGeolocation('us-west-1')).toBe('37.757807,-122.5200005');
      expect(getGeolocation('us-west-2')).toBe('44.0316884,-125.8648088');
      expect(getGeolocation('af-south-1')).toBe('-33.9145291,18.3264237');
      expect(getGeolocation('ap-east-1')).toBe('22.3530259,113.8097542');
      expect(getGeolocation('ap-south-2')).toBe('17.4127332,78.078398');
      expect(getGeolocation('ap-southeast-3')).toBe('-6.2287349,106.2386631');
      expect(getGeolocation('ap-southeast-4')).toBe('-37.9715652,144.7235026');
      expect(getGeolocation('ap-south-1')).toBe('19.082502,72.7163771');
      expect(getGeolocation('ap-northeast-3')).toBe('34.6777115,135.4036368');
      expect(getGeolocation('ap-northeast-2')).toBe('37.5639487,126.3833576');
      expect(getGeolocation('ap-southeast-1')).toBe('1.3146649,103.5146006');
      expect(getGeolocation('ap-southeast-2')).toBe('-33.8472349,150.602339');
      expect(getGeolocation('ap-northeast-1')).toBe('35.5042974,138.4506645');
      expect(getGeolocation('ca-central-1')).toBe('53.0194946,-124.4588843');
      expect(getGeolocation('ca-west-1')).toBe('52.9399159,-106.4508639');
      expect(getGeolocation('eu-central-1')).toBe('50.1213155,8.471759');
      expect(getGeolocation('eu-west-1')).toBe('53.0136462,-17.6787131');
      expect(getGeolocation('eu-west-2')).toBe('51.528607,-0.431226');
      expect(getGeolocation('eu-south-1')).toBe('51.5285378,-0.4312275');
      expect(getGeolocation('eu-west-3')).toBe('48.8589633,2.18223');
      expect(getGeolocation('eu-south-2')).toBe('35.3445091,-17.5680782');
      expect(getGeolocation('eu-north-1')).toBe('59.3262131,17.8172496');
      expect(getGeolocation('eu-central-2')).toBe('47.377295,8.2414212');
      expect(getGeolocation('il-central-1')).toBe('32.0879976,34.7560465');
      expect(getGeolocation('me-south-1')).toBe('25.9411945,50.2579319');
      expect(getGeolocation('me-central-1')).toBe('24.0651122,44.398553');
      expect(getGeolocation('sa-east-1')).toBe('-23.6814347,-46.9249413');
    });

    it('should return "Unknown region" for unknown region', () => {
      const unknownRegion = 'unknown-region' as AWSRegion;
      const geolocation = getGeolocation(unknownRegion);
      expect(geolocation).toBe('Unknown region');
    });
  });

  describe('getFinalGroupedItems', () => {
    const resolvedMetricDataSingle: any[][] = [
      [
        { Label: METRICS_CONFIG.MEM_TOTAL, Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 1073741824, Unit: 'Bytes' }] },
      ],
    ];

    const resolvedMetricDataMultiple: any[][] = [
      [
        { Label: METRICS_CONFIG.MEM_TOTAL, Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 3221225472, Unit: 'Bytes' }] },
        { Label: METRICS_CONFIG.CPU_UTILIZATION_EC2, Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 50 }] },
      ],
    ];

    it('should return grouped items correctly for single MEM_TOTAL metric', () => {
      const result = getFinalGroupedItems(resolvedMetricDataSingle);
      expect(result).toEqual([{ [METRICS_CONFIG.MEM_UTILIZATION]: 1 }]);
    });

    it('should return grouped items correctly for multiple metrics', () => {
      const result = getFinalGroupedItems(resolvedMetricDataMultiple);
      expect(result).toEqual([{ [METRICS_CONFIG.MEM_UTILIZATION]: 3, [METRICS_CONFIG.CPU_UTILIZATION]: 50 }]);
    });

    it('should handle empty resolvedMetricData', () => {
      const result = getFinalGroupedItems([]);
      expect(result).toEqual([]);
    });

    it('should handle resolvedMetricData with no metrics of interest', () => {
      const resolvedMetricDataNoMetrics: any[][] = [
        [
          { Label: 'other_metric', Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 75 }] },
        ],
      ];
      const result = getFinalGroupedItems(resolvedMetricDataNoMetrics);
      expect(result).toEqual([]);
    });
  });

  describe('calculateAverage', () => {
    it('should calculate average correctly for percent values', () => {
      const datapoints: Datapoint[] = [
        { Timestamp: new Date(), Average: 30, Unit: 'Percent' },
        { Timestamp: new Date(), Average: 40, Unit: 'Percent' },
      ];
      const average = calculateAverage(datapoints, true);
      expect(average).toBeCloseTo(35);
    });

    it('should calculate average correctly for byte values', () => {
      const datapoints = [
        { Timestamp: new Date(), Average: 1073741824, Unit: 'Bytes' }, // 1 GB in bytes
        { Timestamp: new Date(), Average: 2147483648, Unit: 'Bytes' }, // 2 GB in bytes
      ];
      const average = calculateAverage(datapoints, false);
      expect(average).toBeCloseTo(1.5);
    });

    it('should return 0 for empty datapoints', () => {
      const average = calculateAverage([], true);
      expect(average).toBe(0);
    });

    it('should return 0 for empty datapoints when isPercentValue is true', () => {
      const average = calculateAverage([], true);
      expect(average).toBe(0);
    });

    it('should return 0 for empty datapoints when isPercentValue is false', () => {
      const average = calculateAverage([], false);
      expect(average).toBe(0);
    });
  });

  describe('convertBytesToGB', () => {
    it('should convert bytes to gigabytes correctly', () => {
      expect(convertBytesToGB(1073741824)).toBeCloseTo(1);
      expect(convertBytesToGB(2147483648)).toBeCloseTo(2);
    });

    it('should handle zero bytes gracefully', () => {
      expect(convertBytesToGB(0)).toBe(0);
    });

    it('should handle large values', () => {
      expect(convertBytesToGB(1099511627776)).toBeCloseTo(1024); // 1 TB in bytes
    });
  });

  describe('convertSecondsToMS', () => {
    it('should convert seconds to milliseconds correctly', () => {
      expect(convertSecondsToMS(1)).toBe(1000);
      expect(convertSecondsToMS(10)).toBe(10000);
    });

    it('should handle zero seconds gracefully', () => {
      expect(convertSecondsToMS(0)).toBe(0);
    });

    it('should handle large values', () => {
      expect(convertSecondsToMS(3600)).toBe(3600000); // 1 hour in seconds
    });
  });

  describe('getInstanceTypes', () => {
    it('should extract instance types correctly', () => {
      const data = [
        {
          Metrics: [{ Dimensions: [{ Name: 'InstanceType', Value: 't2.micro' }] }],
        },
        {
          Metrics: [{ Dimensions: [{ Name: 'InstanceType', Value: 'm5.large' }] }],
        },
        {
          Metrics: [],
        },
      ];

      const instanceTypes = getInstanceTypes(data);
      expect(instanceTypes).toEqual(['t2.micro', 'm5.large']);
    });

    it('should return empty array when no instance types are found', () => {
      const data = [
        {
          Metrics: [{ Dimensions: [{ Name: 'InvalidType', Value: 't2.micro' }] }],
        },
      ];

      const instanceTypes = getInstanceTypes(data);
      expect(instanceTypes).toEqual([]);
    });

    it('should return empty array when input has no metrics', () => {
      const data = [
        {
          Metrics: [],
        },
      ];

      const instanceTypes = getInstanceTypes(data);
      expect(instanceTypes).toEqual([]);
    });

    it('should handle undefined input gracefully', () => {
      const undefinedInput: unknown[] | undefined = undefined;
      const instanceTypes = getInstanceTypes(undefinedInput || []);
      expect(instanceTypes).toEqual([]);
    });
  });

  describe('groupItems', () => {
    it('should group items correctly', () => {
      const items = {
        [METRICS_CONFIG.MEM_TOTAL]: [100, 200, 300],
        [METRICS_CONFIG.CPU_UTILIZATION_EC2]: [30, 40, 50],
      };

      const groupedItems = groupItems(items);

      const expectedGroupedItems = [
        { [METRICS_CONFIG.MEM_UTILIZATION]: 100, [METRICS_CONFIG.CPU_UTILIZATION]: 30 },
        { [METRICS_CONFIG.MEM_UTILIZATION]: 200, [METRICS_CONFIG.CPU_UTILIZATION]: 40 },
        { [METRICS_CONFIG.MEM_UTILIZATION]: 300, [METRICS_CONFIG.CPU_UTILIZATION]: 50 },
      ];

      expect(groupedItems).toEqual(expectedGroupedItems);
    });

    it('should handle empty input gracefully', () => {
      const items = {
        [METRICS_CONFIG.MEM_TOTAL]: [],
        [METRICS_CONFIG.CPU_UTILIZATION_EC2]: [],
      };

      const groupedItems = groupItems(items);

      expect(groupedItems).toEqual([]);
    });

    it('should handle uneven input lengths gracefully', () => {
      const items = {
        [METRICS_CONFIG.MEM_TOTAL]: [100, 200],
        [METRICS_CONFIG.CPU_UTILIZATION_EC2]: [30, 40, 50],
      };

      const groupedItems = groupItems(items);

      const expectedGroupedItems = [
        { [METRICS_CONFIG.MEM_UTILIZATION]: 100, [METRICS_CONFIG.CPU_UTILIZATION]: 30 },
        { [METRICS_CONFIG.MEM_UTILIZATION]: 200, [METRICS_CONFIG.CPU_UTILIZATION]: 40 },
      ];

      expect(groupedItems).toEqual(expectedGroupedItems);
    });
  });

  describe('groupItemsByKeys', () => {
    it('should group items correctly by keys', () => {
      const items: DataItem[] = [
        { 'key1': 100 },
        { 'key2': 200 },
        { 'key1': 300 },
      ];

      const groupedItems = groupItemsByKeys(items);
      expect(groupedItems).toEqual({
        'key1': [100, 300],
        'key2': [200],
      });
    });

    it('should return empty array when input is empty', () => {
      const items: any[] = [];
      const groupedItems = groupItemsByKeys(items);
      expect(groupedItems).toEqual({});
    });
  });

  describe('getMetricAverages', () => {
    it('should return empty array when resolvedMetricData has no valid metrics', () => {
      const resolvedMetricData = [
        [
          { Label: 'invalid_metric', Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 50 }] },
        ],
      ];

      const metricAverages = getMetricAverages(resolvedMetricData);
      expect(metricAverages).toEqual([]);
    });

    it('should calculate average correctly for CPU_UTILIZATION_EC2 metrics', () => {
      const resolvedMetricData = [
        [
          { Label: METRICS_CONFIG.CPU_UTILIZATION_EC2, Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 30 }] },
        ],
      ];

      const metricAverages = getMetricAverages(resolvedMetricData);
      expect(metricAverages).toEqual([{ [METRICS_CONFIG.CPU_UTILIZATION_EC2]: 30 }]);
    });

    it('should calculate average correctly for MEM_TOTAL metrics', () => {
      const resolvedMetricData = [
        [
          { Label: METRICS_CONFIG.MEM_TOTAL, Datapoints: [{ Timestamp: '2024-06-21T12:00:00Z', Average: 2147483648, Unit: 'Bytes' }] },
        ],
      ];

      const metricAverages = getMetricAverages(resolvedMetricData);
      expect(metricAverages).toEqual([{ [METRICS_CONFIG.MEM_TOTAL]: 2 }]);
    });

    it('should return empty array when datapoints are empty', () => {
      const metricAverages = getMetricAverages([]);
      expect(metricAverages).toEqual([]);
    });
  });
});
