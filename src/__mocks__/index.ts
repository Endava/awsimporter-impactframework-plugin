import {Ec2Machine} from '../types';

export const mockGlobalConfig = {
  'aws-importer': {
    tag: 'GreenSoftware',
    location: 'eu-central-1',
    'aws-observation': 60,
    'aws-services': 'ec2, ebs',
  },
  metric: {
    'cloudwatch-namespace': 'TOS_AMI_CloudwatchAgentMetrics',
    'client-namespace': 'AWS/EC2',
  },
};

export const mockOutputResult = [
  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ec2',
    'cloud/instance-type': 't2.micro',
    'memory/utilization': 0.9272994995117188,
    'cpu/utilization': 0.6914698759172085,
  },
  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ec2',
    'cloud/instance-type': 't2.micro',
    'memory/utilization': 0.9272994995117188,
    'cpu/utilization': 0.7249047606754452,
  },
  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ec2',
    'cloud/instance-type': 't2.micro',
    'memory/utilization': 0.9272994995117188,
    'cpu/utilization': 0.6806377495925492,
  },

  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ebs',
    'storage/type': 'ssd',
    'storage/capacity': 8,
  },

  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ebs',
    'storage/type': 'hdd',
    'storage/capacity': 125,
  },

  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ebs',
    'storage/type': 'ssd',
    'storage/capacity': 8,
  },

  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ebs',
    'storage/type': 'hdd',
    'storage/capacity': 125,
  },

  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ebs',
    'storage/type': 'hdd',
    'storage/capacity': 125,
  },

  {
    timestamp: '2024-03-26T14:08:00.000Z',
    duration: '3600',
    location: 'eu-central-1',
    geolocation: '50.1213155,8.471759',
    'cloud/vendor': 'aws',
    'cloud/service': 'ebs',
    'storage/type': 'ssd',
    'storage/capacity': 8,
  },
];

export const mockInstances: Ec2Machine[] = [
  {
    InstanceId: 'i-1234567890abcdef0',
    ImageId: 'ami-1234567890abcdef0',
    InstanceType: 't2.micro',
    RootDeviceName: '/dev/sda1',
    BlockDevices: [
      {
        DeviceName: '/dev/sda1',
        VolumeId: 'vol-1234567890abcdef0',
      },
    ],
  },
];

export const mockInputEC2Machines = {
  region: 'eu-central-1',
  credentials: {
    accessKeyId: 'fakeAccessKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
  },
  tag: 'example-project',
};

export const mockInputVolumes = {
  tag: 'example-project',
  region: 'eu-central-1',
  volumeIds: ['vol-12345678', 'vol-87654321'],
  credentials: {
    accessKeyId: 'fakeAccessKeyId',
    secretAccessKey: 'fakeSecretAccessKey',
  },
};
