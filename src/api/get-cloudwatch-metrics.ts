import {
  CloudWatchClient,
  ListMetricsCommand,
  ListMetricsCommandInput,
  // eslint-disable-next-line node/no-extraneous-import
} from '@aws-sdk/client-cloudwatch';
import {DIMENSIONS} from '../constants/constants';
import {Ec2Machine} from '../types';

/**
 * It fetches the metrics from AWS CloudWatch for a list of EC2 instances
 */

export const getCloudwatchMetrics = (
  instances: Ec2Machine[],
  cloudWatch: CloudWatchClient,
  namespace: string
) => {
  return instances.map(async instance => {
    const input: ListMetricsCommandInput = {
      Namespace: namespace,
      Dimensions: [
        {
          Name: DIMENSIONS.INSTANCE_ID,
          Value: instance.InstanceId,
        },
      ],
    };

    return cloudWatch.send(new ListMetricsCommand(input));
  });
};
