/* eslint-disable node/no-extraneous-import */
import {DescribeInstancesCommand, EC2Client} from '@aws-sdk/client-ec2';
/* eslint-disable node/no-extraneous-import */
import {Ec2Machine, GetEC2MachinesInput} from '../types';

export const getEC2Machines = async ({
  region,
  credentials,
  tag,
}: GetEC2MachinesInput): Promise<Array<Ec2Machine>> => {
  /**
   * Initializes the EC2Client with provided region and credentials
   */
  const ec2Client = new EC2Client({
    region,
    credentials,
  });

  /**
   * Creates a DescribeInstanceCommand with filters for the specific tag and running state
   */
  const command = new DescribeInstancesCommand({
    Filters: [
      {
        Name: 'tag:Project',
        Values: [tag],
      },
      {
        Name: 'instance-state-name',
        Values: ['running'],
      },
    ],
  });

  /**
   * Send the command input to AWS and await the response
   */

  const ec2Machines = await ec2Client.send(command);

  /**
   * Process the response to extract and format the relevant data based on the Reservations key
   */
  const ec2MachinesData = ec2Machines.Reservations?.flatMap(
    instances => instances.Instances ?? []
  ).map(instance => ({
    InstanceId: instance?.InstanceId ?? '',
    ImageId: instance?.ImageId ?? '',
    InstanceType: instance?.InstanceType as string,
    RootDeviceName: instance?.RootDeviceName ?? '',
    BlockDevices: instance?.BlockDeviceMappings?.map(bdm => ({
      DeviceName: bdm.DeviceName ?? '',
      VolumeId: bdm.Ebs?.VolumeId ?? '',
    })),
  }));

  /**
   * The formatted data is necessary for the usage in calls such as CloudWatch or by getting the volumes, if there are no instances found
   * it will return an empty array
   */
  return ec2MachinesData ?? [];
};
