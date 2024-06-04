import {
  AWSRegion,
  CloudWatchData,
  DataItem,
  Datapoint,
  Ec2Machine,
  StorageData,
} from '../types';
import {METRICS_CONFIG} from '../constants/constants';
// eslint-disable-next-line node/no-extraneous-import
import {z} from 'zod';

/**
 * Methods for validations
 */

export const awsImporterSchema = z.object({
  tag: z.string({
    required_error: "The 'tag' field is required for aws-importer.",
    invalid_type_error: "The 'tag' field must be a string.",
  }),
  location: z.string({
    required_error: "The 'location' field is required for aws-importer.",
    invalid_type_error: "The 'location' field must be a string.",
  }),
  'aws-services': z.string({
    required_error: "The 'aws-services' field is required for aws-services.",
    invalid_type_error: "The 'tag' field must be a string.",
  }),
  'aws-observation': z
    .number({
      required_error:
        "The 'aws-observation' field is required for aws-importer.",
      invalid_type_error: "The 'aws-observation' field must be a number.",
    })
    .refine(n => n % 60 === 0, {
      message: 'aws-observation must be a multiple of 60.',
    }),
});

export const metricSchema = z.object({
  'cloudwatch-namespace': z.string({
    required_error: "The 'cloudwatch-namespace' field is required for metric.",
    invalid_type_error: "The 'cloudwatch-namespace' field must be a string.",
  }),
  'client-namespace': z.string({
    required_error: "The 'client-namespace' field is required for metric.",
    invalid_type_error: "The 'client-namespace' field must be a string.",
  }),
});

export const globalConfigSchema = z.object({
  'aws-importer': awsImporterSchema.optional().refine(Boolean, {
    message: 'The aws-importer configuration is required.',
  }),
  metric: metricSchema.optional().refine(Boolean, {
    message: 'The metric configuration is required.',
  }),
});

export const inputSchema = z.object({
  timestamp: z
    .string({
      required_error: "The 'timestamp' field is required.",
      invalid_type_error: "The 'timestamp' field must be a string.",
    })
    .refine(val => !isNaN(Date.parse(val)), {
      message: 'Invalid timestamp; must be a valid ISO date string.',
    }),
  duration: z
    .number({
      required_error: "The 'duration' field is required.",
      invalid_type_error: "The 'duration' field must be a number.",
    })
    .positive('Invalid duration; must be a positive number.'),
});

/**
 *   Methods for CloudWatch data
 */

export function calculateAverage(
  datapoints: Datapoint[],
  isPercentValue: boolean
): number {
  if (!datapoints || datapoints.length === 0) {
    return 0;
  }

  if (isPercentValue) {
    let sum = 0;
    for (const datapoint of datapoints) {
      sum += datapoint.Average;
    }

    return sum / datapoints.length;
  } else {
    let sum = 0;
    for (const datapoint of datapoints) {
      sum += convertBytesToGB(datapoint.Average)
        ? convertBytesToGB(datapoint.Average)
        : 0;
    }

    return sum / datapoints.length;
  }
}

export const convertBytesToGB = (value: number): number => {
  return value / Math.pow(1024, 3);
};
export const convertSecondsToMS = (value: number): number => {
  return value * 1000;
};

export const getInstanceTypes = (data: unknown[]) => {
  const instanceTypes = new Set();
  data.forEach(item => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    item.Metrics.forEach((metric: {Dimensions: any[]}) => {
      metric.Dimensions.forEach(dimension => {
        if (dimension.Name === 'InstanceType') {
          instanceTypes.add(dimension.Value);
        }
      });
    });
  });

  return Array.from(instanceTypes);
};

export const groupItems = (items: {
  [key: string]: number[];
}): {[key: string]: number}[] => {
  const groupedArray: {
    [key: string]: number;
  }[] = [];

  for (let i = 0; i < items[METRICS_CONFIG.MEM_TOTAL].length; i++) {
    const groupedObject: {[key: string]: number} = {};

    groupedObject[METRICS_CONFIG.MEM_UTILIZATION] =
      items[METRICS_CONFIG.MEM_TOTAL][i];
    groupedObject[METRICS_CONFIG.CPU_UTILIZATION] =
      items[METRICS_CONFIG.CPU_UTILIZATION_EC2][i];

    groupedArray.push(groupedObject);
  }

  return groupedArray;
};

export const groupItemsByKeys = (
  items: DataItem[]
): {
  [key: string]: number[];
} => {
  return items.reduce(
    (groups, item) => {
      const [key] = Object.keys(item);
      const value = item[key];
      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(value);
      return groups;
    },
    {} as {[key: string]: number[]}
  );
};

export const getMetricAverages = (resolvedMetricData: any) => {
  return resolvedMetricData
    .map((values: any[]) => {
      return values.reduce<{[key: string]: number}[]>((acc, value) => {
        if (
          value.Datapoints &&
          (value.Label === METRICS_CONFIG.MEM_TOTAL ||
            value.Label === METRICS_CONFIG.CPU_UTILIZATION_EC2)
        ) {
          let isPercentValue = false;
          if (value.Label === METRICS_CONFIG.CPU_UTILIZATION_EC2) {
            isPercentValue = true;
          }

          const key = value.Label;
          const average = calculateAverage(value.Datapoints, isPercentValue);
          acc.push({[key]: average});
        }
        return acc;
      }, []);
    })
    .flat();
};

export const getFinalGroupedItems = (resolvedMetricData: any) => {
  const metricAverages = getMetricAverages(resolvedMetricData);
  console.log('metricAverages', metricAverages);
  const groupedItems = groupItemsByKeys(metricAverages);
  console.log('groupedItems', groupedItems);
  return groupItems(groupedItems);
};

/**
 * Methods for EC2 volumes
 */

export const getVolumeIds = (instances: Ec2Machine[] | undefined): string[] => {
  if (!instances) {
    return [];
  }
  return instances.flatMap(({BlockDevices}: Ec2Machine) => {
    if (BlockDevices) {
      return BlockDevices.map((device: {VolumeId: string}) => device.VolumeId);
    } else {
      return [];
    }
  });
};

/**
 * Method to get the geolocation
 */

export const getGeolocation = (region: AWSRegion): string => {
  switch (region) {
    case 'us-east-2':
      return '40.3375813,-85.3089691';
    case 'us-east-1':
      return '38.8809212,-77.1845565';
    case 'us-west-1':
      return '37.757807,-122.5200005';
    case 'us-west-2':
      return '44.0316884,-125.8648088';
    case 'af-south-1':
      return '-33.9145291,18.3264237';
    case 'ap-east-1':
      return '22.3530259,113.8097542';
    case 'ap-south-2':
      return '17.4127332,78.078398';
    case 'ap-southeast-3':
      return '-6.2287349,106.2386631';
    case 'ap-southeast-4':
      return '-37.9715652,144.7235026';
    case 'ap-south-1':
      return '19.082502,72.7163771';
    case 'ap-northeast-3':
      return '34.6777115,135.4036368';
    case 'ap-northeast-2':
      return '37.5639487,126.3833576';
    case 'ap-southeast-1':
      return '1.3146649,103.5146006';
    case 'ap-southeast-2':
      return '-33.8472349,150.602339';
    case 'ap-northeast-1':
      return '35.5042974,138.4506645';
    case 'ca-central-1':
      return '53.0194946,-124.4588843';
    case 'ca-west-1':
      return '52.9399159,-106.4508639';
    case 'eu-central-1':
      return '50.1213155,8.471759';
    case 'eu-west-1':
      return '53.0136462,-17.6787131';
    case 'eu-west-2':
      return '51.528607,-0.431226';
    case 'eu-south-1':
      return '51.5285378,-0.4312275';
    case 'eu-west-3':
      return '48.8589633,2.18223';
    case 'eu-south-2':
      return '35.3445091,-17.5680782';
    case 'eu-north-1':
      return '59.3262131,17.8172496';
    case 'eu-central-2':
      return '47.377295,8.2414212';
    case 'il-central-1':
      return '32.0879976,34.7560465';
    case 'me-south-1':
      return '25.9411945,50.2579319';
    case 'me-central-1':
      return '24.0651122,44.398553';
    case 'sa-east-1':
      return '-23.6814347,-46.9249413';
    default:
      return 'Unknown region';
  }
};

export const getFinalData = (
  servicesArray: string[],
  allCloudWatchData: CloudWatchData[],
  diskData: StorageData[]
): (CloudWatchData | StorageData)[] => {
  let finalData: (CloudWatchData | StorageData)[] = [];

  if (servicesArray.includes('ec2')) {
    finalData = [...finalData, ...allCloudWatchData];
  }

  if (servicesArray.includes('ebs')) {
    finalData = [...finalData, ...diskData];
  }

  return finalData;
};
