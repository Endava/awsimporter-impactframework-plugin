export type YourGlobalConfig = Record<string, any>;

export type AWSCredentials = {
  accessKeyId: string;
  secretAccessKey: string;
};

export type GetEC2MachinesInput = {
  tag: string;
  region: string;
  credentials: AWSCredentials;
};

export type Ec2Machine = {
  InstanceId: string | undefined;
  ImageId: string | undefined;
  InstanceType: string | undefined;
  RootDeviceName: string | undefined;
  BlockDevices: BlockDevicesInterface[] | undefined;
};

export type Reservation = {
  Groups?: any[];
  Instances?: any[];
  OwnerId?: string;
  RequesterId?: string;
  ReservationId?: string;
};

export type DataItem = {
  [key: string]: number;
};

export type BlockDevicesInterface = {
  DeviceName: string;
  VolumeId: string;
};

export type VolumesOutput = {
  ['storage/type']: string;
  ['storage/capacity']: number;
};

export type GetEC2VolumesInput = {
  tag: string;
  region: string;
  volumeIds: string[];
  credentials: AWSCredentials;
};

export type Volume = {
  Attachments: Array<Attachment> | undefined;
  AvailabilityZone: string | undefined;
  CreateTime: Date | undefined;
  Encrypted: boolean | undefined;
  Size: number | undefined;
  SnapshotId: string | undefined;
  State: string | undefined;
  VolumeId: string | undefined;
  Iops: number | undefined;
  Tags: Array<Tag> | undefined;
  VolumeType: string | undefined;
  MultiAttachEnabled: boolean | undefined;
};

export type Attachment = {
  AttachTime: Date;
  Device: string;
  InstanceId: string;
  State: string;
  VolumeId: string;
  DeleteOnTermination: boolean;
};

export type Tag = {
  Key: string;
  Value: string;
};

export type Datapoint = {
  Timestamp: Date;
  Average: number;
  Unit: string;
};

export type MetricDataItem = {
  ['$metadata']: Metadata;
  Label?: string;
  Datapoints: Datapoint[];
};

interface Metadata {
  [key: string]: any;
}

export type ResolvedMetricData = MetricDataItem[];

export type GroupeItem = {
  ['cpu/utilization']: number;
  ['memory/utilization']: number;
};

export type AWSRegion =
  | 'us-east-2'
  | 'us-east-1'
  | 'us-west-1'
  | 'us-west-2'
  | 'af-south-1'
  | 'ap-east-1'
  | 'ap-south-2'
  | 'ap-southeast-3'
  | 'ap-southeast-4'
  | 'ap-south-1'
  | 'ap-northeast-3'
  | 'ap-northeast-2'
  | 'ap-southeast-1'
  | 'ap-southeast-2'
  | 'ap-northeast-1'
  | 'ca-central-1'
  | 'ca-west-1'
  | 'eu-central-1'
  | 'eu-west-1'
  | 'eu-west-2'
  | 'eu-south-1'
  | 'eu-west-3'
  | 'eu-south-2'
  | 'eu-north-1'
  | 'eu-central-2'
  | 'il-central-1'
  | 'me-south-1'
  | 'me-central-1'
  | 'sa-east-1';

export type CloudWatchData = {
  timestamp: string;
  duration: number;
  location: string;
  geolocation: string;
  ['cloud/vendor']: string;
  ['cloud/service']: string;
  ['cloud/instance-type']: string;
  ['memory/utilization']: number;
  ['cpu/utilization']: number;
};

export type StorageData = {
  timestamp: string;
  duration: number;
  location: string;
  geolocation: string;
  ['cloud/vendor']: 'aws'; // Assuming 'aws' is fixed; if not, change to string
  ['cloud/service']: 'ebs'; // Assuming 'ebs' is fixed; if it can be different, change to string
  ['storage/type']: string;
  ['storage/capacity']: number;
};
