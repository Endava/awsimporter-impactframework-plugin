// eslint-disable-next-line node/no-extraneous-import
import {DescribeVolumesCommand, EC2Client} from '@aws-sdk/client-ec2';
import {GetEC2VolumesInput, VolumesOutput} from '../types';
import {VOLUME_CONFIG} from '../constants/constants';

export const getEc2Volumes = async ({
  tag,
  region,
  volumeIds,
  credentials,
}: GetEC2VolumesInput): Promise<VolumesOutput[] | undefined> => {
  const ec2Client = new EC2Client({
    region,
    credentials,
  });

  const command = new DescribeVolumesCommand({
    Filters: [
      {
        Name: 'tag:Project',
        Values: [tag],
      },
    ],
    VolumeIds: volumeIds,
  });

  const response = await ec2Client.send(command);

  const volumes = response.Volumes;

  if (!volumes) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return volumes.map(volume => {
    let storageType: string | undefined;

    switch (volume.VolumeType) {
      case VOLUME_CONFIG.GP3_ID:
        storageType = VOLUME_CONFIG.SSD_ID;
        break;
      case VOLUME_CONFIG.SC1_ID:
        storageType = VOLUME_CONFIG.HDD_ID;
        break;
      default:
        storageType = undefined;
        break;
    }

    return {
      'storage/type': storageType,
      'storage/capacity': volume.Size,
    };
  });
};
